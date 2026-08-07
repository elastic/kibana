/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { verifyKiStepCommonDefinition } from '../../common/step_types/verify_ki_step';
import { createKiVerificationService } from '../ki_verification';

/**
 * Verify KI step server-side definition.
 *
 * Runs the registered knowledge item verifiers against the candidate KI and
 * returns the verification summary. Verification failures are reported in the
 * step output rather than as step errors, so workflows can branch on `valid`.
 */
export const verifyKiStepDefinition = createServerStepDefinition({
  ...verifyKiStepCommonDefinition,
  handler: async (context) => {
    const service = createKiVerificationService();
    const output = await service.verify(context.input.ki, {
      esClient: context.contextManager.getScopedEsClient(),
      logger: context.logger,
      abortSignal: context.abortSignal,
    });
    return { output };
  },
});
