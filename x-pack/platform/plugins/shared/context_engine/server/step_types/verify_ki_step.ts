/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { VerifyKiStepCommonDefinition } from '../../common/step_types/verify_ki_step';
import {
  createKiVerifierRegistry,
  createWorkflowVerifier,
  KiVerificationService,
} from '../ki_verification';
import type { KiVerifier, KiVerifierWorkflowRunner } from '../ki_verification';
import type { ContextEngineAnalyticsService } from '../telemetry';
import { withKiVerificationTelemetry } from './helpers';

export const createVerifyKiStepDefinition = (
  coreSetup: CoreSetup,
  logger: Logger,
  analyticsService: ContextEngineAnalyticsService,
  workflowsManagement?: KiVerifierWorkflowRunner
) => {
  const registry = createKiVerifierRegistry();
  const service = new KiVerificationService(registry);

  const resolveBuiltIn = (id: string): KiVerifier => {
    const verifier = registry.get(id);
    if (!verifier) {
      throw new ExecutionError({
        type: 'ValidationError',
        message: `Unknown built-in KI verifier '${id}'. Known verifiers: ${registry
          .getAll()
          .map((v) => v.id)
          .join(', ')}`,
      });
    }
    return verifier;
  };

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

      const { spaceId } = context.contextManager.getContext().workflow;
      const verifiers = context.input.verifiers?.map((entry) => {
        if (!('workflow_id' in entry)) {
          return resolveBuiltIn(entry.id);
        }
        if (!workflowsManagement) {
          throw new ExecutionError({
            type: 'FeatureDisabledError',
            message:
              'Custom KI verifiers require the workflowsManagement plugin, which is not available.',
          });
        }
        return createWorkflowVerifier(entry, {
          workflowsManagement,
          request: fakeRequest,
          spaceId,
        });
      });

      const summary = await withKiVerificationTelemetry({
        analyticsService,
        logger,
        run: () =>
          service.verifyKi(
            context.input.ki,
            {
              isEnabled,
              esClient: context.contextManager.getScopedEsClient(),
              logger,
              abortSignal: context.abortSignal,
            },
            verifiers
          ),
      });

      return { output: summary };
    },
  });
};
