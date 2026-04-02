/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS, EVALS_INTERNAL_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import { SkillClient } from '../../storage/skill_client';
import type { AesopRouteDependencies } from '.';

const EVALS_SKILL_VALIDATE_URL = `${EVALS_INTERNAL_URL}/skills/{skillId}/validate` as const;

const ValidateSkillRequestParams = z.object({
  skillId: z.string(),
});

const ValidateSkillRequestBody = z.object({
  connector_id: z.string().min(1),
  auto_converge: z.boolean().optional(),
  evaluators: z.array(z.string()).optional(),
  connector_ids: z.array(z.string()).optional(),
  threshold: z.number().min(0).max(1).optional(),
  max_iterations: z.number().min(1).max(10).optional(),
  convergence_delta: z.number().min(0).max(0.5).optional(),
  required_pass: z.array(z.string()).optional(),
});

export const registerValidateSkillRoute = ({
  router,
  logger,
  skillValidationService,
}: AesopRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_SKILL_VALIDATE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Validate a proposed skill using evaluators',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ValidateSkillRequestParams),
            body: buildRouteValidationWithZod(ValidateSkillRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { skillId } = request.params;
          const {
            connector_id: connectorId,
            auto_converge: autoConverge,
            evaluators,
            connector_ids: connectorIds,
            threshold,
            max_iterations: maxIterations,
            convergence_delta: convergenceDelta,
            required_pass: requiredPass,
          } = request.body;

          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const skillClient = new SkillClient(soClient);

          let so;
          try {
            so = await skillClient.get(skillId);
          } catch (error) {
            if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
              return response.notFound({
                body: { message: `Skill not found: ${skillId}` },
              });
            }
            throw error;
          }

          const skill = skillClient.toDocument(so);

          if (autoConverge) {
            return response.badRequest({
              body: {
                message:
                  'auto_converge is not yet available — inference client integration pending. Use single-pass validation (auto_converge: false).',
              },
            });
          }

          // Mark as validating
          await skillClient.update(skillId, {
            validation_status: 'validating',
            validation_started_at: new Date().toISOString(),
            validation_connector_id: connectorId,
          });

          const validation = await skillValidationService.validateSkill(
            skill,
            {
              threshold: threshold ?? 0.85,
              maxIterations: maxIterations ?? 5,
              convergenceDelta: convergenceDelta ?? 0.02,
              connectorId,
              connectorIds,
              evaluators,
              requiredPass,
            },
            { autoConverge }
          );

          // Persist validation results
          await skillClient.update(skillId, {
            validation_status: validation.status,
            validation_final_score: validation.final_score,
            validation_composite_score: validation.composite_score,
            validation_composite_grade: validation.composite_grade,
            validation_started_at: validation.started_at,
            validation_completed_at: validation.completed_at,
            validation_connector_id: validation.connector_id,
            validation_duration_ms: validation.duration_ms,
            validation_evaluator_results: validation.evaluator_results
              ? JSON.stringify(validation.evaluator_results)
              : undefined,
            validation_gate_result: validation.gate_result
              ? JSON.stringify(validation.gate_result)
              : undefined,
            validation_iterations: validation.iterations
              ? JSON.stringify(validation.iterations)
              : undefined,
            validation_convergence: validation.convergence
              ? JSON.stringify(validation.convergence)
              : undefined,
            validation_error: validation.error,
          });

          return response.ok({
            body: {
              skill_id: skillId,
              validation,
            },
          });
        } catch (error) {
          logger.error(`Failed to validate skill: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to validate skill' },
          });
        }
      }
    );
};
