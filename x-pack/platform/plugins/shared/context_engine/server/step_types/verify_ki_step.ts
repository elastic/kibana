/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import {
  DEFAULT_KI_VERIFIER_STEP_TIMEOUT_SEC,
  VerifyKiStepCommonDefinition,
} from '../../common/step_types/verify_ki_step';
import {
  createKiVerifierRegistry,
  createWorkflowVerifier,
  KiVerificationInputError,
  KiVerificationService,
  MAX_KI_VERIFIER_WORKFLOW_DEPTH,
  resolveKiVerifierChain,
} from '../ki_verification';
import type { KiVerifier, KiVerifierWorkflowRunner } from '../ki_verification';
import type { ContextEngineAnalyticsService } from '../telemetry';
import { isContextEngineEnabledInSpace } from '../utils/is_context_engine_enabled_in_space';
import { withKiVerificationTelemetry } from './helpers';

export interface WorkflowVerifierStepDependencies {
  getWorkflowsManagement: () => Promise<KiVerifierWorkflowRunner | undefined>;
  /** Checks if the request has permission to run workflows in the space. */
  checkExecutePrivilege: (request: KibanaRequest, spaceId: string) => Promise<boolean>;
}

export const createVerifyKiStepDefinition = (
  coreSetup: CoreSetup,
  logger: Logger,
  analyticsService: ContextEngineAnalyticsService,
  workflowVerifierDeps?: WorkflowVerifierStepDependencies
) => {
  const service = new KiVerificationService(createKiVerifierRegistry());

  return createServerStepDefinition({
    ...VerifyKiStepCommonDefinition,
    handler: async (context) => {
      const [coreStart] = await coreSetup.getStartServices();
      const fakeRequest = context.contextManager.getFakeRequest();
      const { workflow, metadata, parent } = context.contextManager.getContext();
      const { spaceId } = workflow;
      const isEnabled = await isContextEngineEnabledInSpace({
        savedObjects: coreStart.savedObjects,
        uiSettings: coreStart.uiSettings,
        spaceId,
      });
      if (!isEnabled) {
        throw new ExecutionError({
          type: 'FeatureDisabledError',
          message: `Context Engine is disabled. Enable the ${CONTEXT_ENGINE_ENABLED_SETTING_ID} advanced setting to verify knowledge indicators.`,
        });
      }

      const buildVerifiers = async (): Promise<Array<string | KiVerifier> | undefined> => {
        const entries = context.input.verifiers;
        if (entries === undefined) {
          return undefined;
        }
        const builtInIds = entries.filter(
          (entry): entry is Exclude<typeof entry, { workflow_id: string }> =>
            typeof entry === 'string'
        );
        if (builtInIds.length === entries.length) {
          return builtInIds;
        }
        const workflowsManagement = await workflowVerifierDeps?.getWorkflowsManagement();
        if (!workflowVerifierDeps || !workflowsManagement) {
          throw new ExecutionError({
            type: 'FeatureDisabledError',
            message:
              'Custom KI verifiers require the workflowsManagement plugin, which is not available.',
          });
        }
        if (!(await workflowVerifierDeps.checkExecutePrivilege(fakeRequest, spaceId))) {
          throw new ExecutionError({
            type: 'PermissionError',
            message: 'Insufficient privileges to execute workflows as KI verifiers',
          });
        }

        const verifierChain = await resolveKiVerifierChain({
          workflowId: workflow.id,
          metadata,
          parent,
          spaceId,
          workflowsManagement,
          request: fakeRequest,
        });
        if (verifierChain.length > MAX_KI_VERIFIER_WORKFLOW_DEPTH) {
          throw new ExecutionError({
            type: 'InputValidationError',
            message: `Verifier workflows are nested too deeply (chain: ${verifierChain.join(
              ' -> '
            )}); the maximum depth is ${MAX_KI_VERIFIER_WORKFLOW_DEPTH}`,
          });
        }

        const auditLogger = coreStart.security.audit.asScoped(fakeRequest);
        return entries.map((entry): string | KiVerifier => {
          if (typeof entry === 'string') {
            return entry;
          }
          if (verifierChain.includes(entry.workflow_id)) {
            throw new ExecutionError({
              type: 'InputValidationError',
              message: `Verifier workflow '${entry.workflow_id}' would call itself (chain: ${[
                ...verifierChain,
                entry.workflow_id,
              ].join(' -> ')})`,
            });
          }
          return createWorkflowVerifier(entry, {
            workflowsManagement,
            request: fakeRequest,
            spaceId,
            auditLogger,
            verifierChain,
          });
        });
      };

      const totalTimeoutMs =
        (context.input.total_timeout_sec ?? DEFAULT_KI_VERIFIER_STEP_TIMEOUT_SEC) * 1000;
      const totalController = new AbortController();
      const totalTimer = setTimeout(() => totalController.abort(), totalTimeoutMs);
      const onStepAbort = () => totalController.abort();
      // An already-aborted signal never fires 'abort' again.
      if (context.abortSignal.aborted) {
        onStepAbort();
      } else {
        context.abortSignal.addEventListener('abort', onStepAbort, { once: true });
      }
      const abortSignal = totalController.signal;

      const summary = await withKiVerificationTelemetry({
        analyticsService,
        logger,
        workflowId: workflow.id,
        aiIndexId: context.input.ai_index_id,
        run: async () => {
          const verifiers = await buildVerifiers();
          try {
            return await service.verifyKi(context.input.ki, {
              isEnabled,
              esClient: context.contextManager.getScopedEsClient(),
              logger,
              abortSignal,
              verifiers,
            });
          } catch (error) {
            if (error instanceof KiVerificationInputError) {
              throw new ExecutionError({
                type: 'InputValidationError',
                message: error.message,
              });
            }
            throw error;
          }
        },
      }).finally(() => {
        clearTimeout(totalTimer);
        context.abortSignal.removeEventListener('abort', onStepAbort);
      });

      return { output: summary };
    },
  });
};
