/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { updateKiStepCommonDefinition } from '../../common/step_types/update_ki';
import type { AiIndexService } from '../ai_indices/service';
import { findKiBackingIndex, resolveAiIndexDest } from './helpers';

export const getUpdateKiStepDefinition = (getAiIndexService: () => AiIndexService) =>
  createServerStepDefinition({
    ...updateKiStepCommonDefinition,
    handler: async (context) => {
      const { ai_index_id: aiIndexId, ki_id: kiId, ki } = context.input;

      const dest = await resolveAiIndexDest(getAiIndexService, aiIndexId);
      const esClient = context.contextManager.getScopedEsClient();

      const backingIndex = await findKiBackingIndex({
        esClient,
        aiIndexId,
        destValue: dest.value,
        kiId,
        abortSignal: context.abortSignal,
      });

      const response = await esClient.update(
        {
          index: backingIndex,
          id: kiId,
          doc: ki,
          refresh: 'wait_for',
        },
        { signal: context.abortSignal }
      );

      return {
        output: {
          id: kiId,
          result: response.result === 'noop' ? ('noop' as const) : ('updated' as const),
        },
      };
    },
  });
