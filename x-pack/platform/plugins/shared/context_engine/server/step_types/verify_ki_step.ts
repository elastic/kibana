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
import { VerifyKiStepCommonDefinition } from '../../common/step_types/verify_ki_step';
import {
  createKiVerifierRegistry,
  createWorkflowVerifier,
  KiVerificationInputError,
  KiVerificationService,
} from '../ki_verification';
import type { KiVerifier, KiVerifierWorkflowRunner } from '../ki_verification';
import type { ContextEngineAnalyticsService } from '../telemetry';
import { withKiVerificationTelemetry } from './helpers';

/** What custom verifier workflows need; absent when the workflows management plugin is not available. */
export interface WorkflowVerifierStepDependencies {
  workflowsManagement: KiVerifierWorkflowRunner;
  /** Whether the request may execute workflows in the space, mirroring the run route's privilege. */
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
      const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
      const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);
      const isEnabled = (await uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)) ?? false;
      if (!isEnabled) {
        throw new ExecutionError({
          type: 'FeatureDisabledError',
          message: `Context Engine is disabled. Enable the ${CONTEXT_ENGINE_ENABLED_SETTING_ID} advanced setting to verify knowledge indicators.`,
        });
      }

      const entries = context.input.verifiers ?? [];
      const { spaceId } = context.contextManager.getContext().workflow;
      const hasWorkflowVerifiers = entries.some((entry) => typeof entry !== 'string');
      if (
        hasWorkflowVerifiers &&
        workflowVerifierDeps &&
        !(await workflowVerifierDeps.checkExecutePrivilege(fakeRequest, spaceId))
      ) {
        throw new ExecutionError({
          type: 'PermissionError',
          message: 'Insufficient privileges to execute workflows as KI verifiers',
        });
      }

      const auditLogger = coreStart.security.audit.asScoped(fakeRequest);
      const verifiers = entries.map((entry): string | KiVerifier => {
        if (typeof entry === 'string') {
          return entry;
        }
        if (!workflowVerifierDeps) {
          throw new ExecutionError({
            type: 'FeatureDisabledError',
            message:
              'Custom KI verifiers require the workflowsManagement plugin, which is not available.',
          });
        }
        return createWorkflowVerifier(entry, {
          workflowsManagement: workflowVerifierDeps.workflowsManagement,
          request: fakeRequest,
          spaceId,
          auditLogger,
        });
      });

      const summary = await withKiVerificationTelemetry({
        analyticsService,
        logger,
        run: async () => {
          try {
            return await service.verifyKi(context.input.ki, {
              isEnabled,
              esClient: context.contextManager.getScopedEsClient(),
              logger,
              abortSignal: context.abortSignal,
              verifiers: context.input.verifiers === undefined ? undefined : verifiers,
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
      });

      return { output: summary };
    },
  });
};
