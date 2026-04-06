/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { API_VERSIONS, EVALS_INTERNAL_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { EvaluationRouteDependencies } from '.';
import type { PairwiseSkill } from '../../lib/pairwise/pairwise_runner';
import { SkillClient } from '../../storage/skill_client';

const EVALS_PAIRWISE_URL = `${EVALS_INTERNAL_URL}/experiments/pairwise` as const;

const InlineSkill = z.object({
  name: z.string(),
  description: z.string(),
  markdown: z.string(),
});

const PairwiseRequestBody = z
  .object({
    // Option 1: skill IDs (loaded from SO)
    skill_a_id: z.string().optional(),
    skill_b_id: z.string().optional(),
    // Option 2: inline skills
    skill_a: InlineSkill.optional(),
    skill_b: InlineSkill.optional(),
    // Required
    dataset_id: z.string(),
    evaluators: z.array(z.string()).min(1),
    connector_id: z.string(),
    repetitions: z.number().min(1).max(10).default(1),
  })
  .refine((data) => (data.skill_a_id || data.skill_a) && (data.skill_b_id || data.skill_b), {
    message: 'Either skill_a_id or skill_a (inline) must be provided for both skills',
  });

export const registerPairwiseRoute = ({
  router,
  logger,
  evaluatorRegistry,
}: EvaluationRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_PAIRWISE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Run pairwise experiment comparing two skills',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PairwiseRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const {
            dataset_id: datasetId,
            evaluators,
            connector_id: connectorId,
            repetitions,
          } = request.body;

          // Validate evaluators exist
          for (const name of evaluators) {
            if (!evaluatorRegistry.has(name)) {
              return response.customError({
                statusCode: 400,
                body: { message: `Evaluator not found: ${name}` },
              });
            }
          }

          // Fetch dataset examples
          const coreContext = await context.core;

          // Resolve skills
          const soClient = coreContext.savedObjects.client;
          const skillClient = new SkillClient(soClient);

          const skillA = await resolveSkill('a', request.body, skillClient);
          const skillB = await resolveSkill('b', request.body, skillClient);

          if (!skillA) {
            return response.notFound({
              body: { message: `Skill A not found: ${request.body.skill_a_id}` },
            });
          }
          if (!skillB) {
            return response.notFound({
              body: { message: `Skill B not found: ${request.body.skill_b_id}` },
            });
          }
          const evalsContext = await context.evals;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);
          const dataset = await datasetClient.get(datasetId);

          if (!dataset) {
            return response.notFound({
              body: { message: `Dataset not found: ${datasetId}` },
            });
          }

          const examples = dataset.examples.map((ex) => ({
            input: ex.input ?? {},
            output: ex.output,
            metadata: ex.metadata,
          }));

          const { runPairwiseExperiment } = await import('../../lib/pairwise/pairwise_runner');

          const result = await runPairwiseExperiment(
            { skillA, skillB, examples, evaluatorNames: evaluators, connectorId, repetitions },
            { evaluatorRegistry, logger }
          );

          // Transform camelCase library output to snake_case HTTP response
          const body = {
            ...result,
            per_evaluator: result.per_evaluator.map((e) => ({
              evaluator: e.evaluator,
              score_a: e.scoreA,
              score_b: e.scoreB,
              delta: e.delta,
              direction: e.direction,
            })),
          };

          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to run pairwise experiment: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to run pairwise experiment' },
          });
        }
      }
    );
};

const resolveSkill = async (
  side: 'a' | 'b',
  body: z.infer<typeof PairwiseRequestBody>,
  skillClient: SkillClient
): Promise<PairwiseSkill | null> => {
  const inline = side === 'a' ? body.skill_a : body.skill_b;
  const id = side === 'a' ? body.skill_a_id : body.skill_b_id;

  if (inline) {
    return {
      id: id ?? `inline-${side}`,
      name: inline.name,
      description: inline.description,
      markdown: inline.markdown,
    };
  }

  if (id) {
    try {
      const so = await skillClient.get(id);
      const skill = skillClient.toDocument(so);
      return {
        id: skill.id ?? id,
        name: skill.name,
        description: skill.description,
        markdown: skill.markdown,
      };
    } catch {
      return null;
    }
  }

  return null;
};
