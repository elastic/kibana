/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { VerifyKiStepCommonDefinition } from '../../common/step_types/verify_ki_step';
import { createKiVerifierRegistry, KiVerificationService } from '../ki_verification';

export const createVerifyKiStepDefinition = (coreSetup: CoreSetup, logger: Logger) =>
  createServerStepDefinition({
    ...VerifyKiStepCommonDefinition,
    handler: async (context) => {
      const [coreStart] = await coreSetup.getStartServices();
      const fakeRequest = context.contextManager.getFakeRequest();
      const esClient = coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
      const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
      const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);
      const isEnabled = (await uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)) ?? false;

      const service = new KiVerificationService(createKiVerifierRegistry());
      const summary = await service.verifyKi(context.input.ki, {
        isEnabled,
        esClient,
        logger,
        abortSignal: context.abortSignal,
      });

      return { output: summary };
    },
  });
