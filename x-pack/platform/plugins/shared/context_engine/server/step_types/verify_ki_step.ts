/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { VerifyKiStepCommonDefinition } from '../../common/step_types/verify_ki_step';
import { omitNullKiAttributes } from '../../common/step_types/ki';
import { isContextEngineEnabledInSpace } from '../utils/is_context_engine_enabled_in_space';
import type { VerifyKi } from './verify_ki';

export const createVerifyKiStepDefinition = (coreSetup: CoreSetup, verifyKi: VerifyKi) =>
  createServerStepDefinition({
    ...VerifyKiStepCommonDefinition,
    handler: async (context) => {
      const [coreStart] = await coreSetup.getStartServices();
      const { spaceId } = context.contextManager.getContext().workflow;
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

      const {
        ki,
        verifiers,
        ai_index_id: aiIndexId,
        total_timeout_sec: totalTimeoutSec,
      } = context.input;
      const summary = await verifyKi({
        context,
        ki: omitNullKiAttributes(ki),
        verifiers,
        aiIndexId,
        totalTimeoutSec,
      });
      return { output: summary };
    },
  });
