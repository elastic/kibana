/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { verifyKiStepCommonDefinition } from '../../common/step_types/verify_ki_step';
import { createKiVerificationService } from '../ki_verification';

export interface VerifyKiStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
}

/**
 * Verify KI step server-side definition.
 *
 * Runs the registered knowledge item verifiers against the candidate KI and
 * returns the verification summary. Verification failures are reported in the
 * step output rather than as step errors, so workflows can branch on `verdict`.
 */
export const createVerifyKiStepDefinition = ({
  isContextEngineEnabled,
}: VerifyKiStepDependencies) =>
  createServerStepDefinition({
    ...verifyKiStepCommonDefinition,
    handler: async (context) => {
      const isEnabled = await isContextEngineEnabled(context.contextManager.getFakeRequest());
      if (!isEnabled) {
        return {
          error: new ExecutionError({
            type: 'ContextEngineDisabledError',
            message: `The Context Engine is disabled. Enable the '${CONTEXT_ENGINE_ENABLED_SETTING_ID}' advanced setting to use this step.`,
          }),
        };
      }

      const service = createKiVerificationService();
      const output = await service.verify(context.input.ki, {
        esClient: context.contextManager.getScopedEsClient(),
        logger: context.logger,
        abortSignal: context.abortSignal,
      });
      return { output };
    },
  });
