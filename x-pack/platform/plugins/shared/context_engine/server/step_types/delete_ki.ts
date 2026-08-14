/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { deleteKiStepCommonDefinition } from '../../common/step_types/delete_ki';
import type { AiIndexService } from '../ai_indices/service';
import { findKiBackingIndex, resolveAiIndexDest } from './helpers';

export const getDeleteKiStepDefinition = (getAiIndexService: () => AiIndexService) =>
  createServerStepDefinition({
    ...deleteKiStepCommonDefinition,
    handler: async (context) => {
      const { ai_index_id: aiIndexId, ki_id: kiId } = context.input;

      const dest = await resolveAiIndexDest(getAiIndexService, aiIndexId);
      const esClient = context.contextManager.getScopedEsClient();

      const backingIndex = await findKiBackingIndex({
        esClient,
        aiIndexId,
        destValue: dest.value,
        kiId,
        abortSignal: context.abortSignal,
      });

      const response = await esClient.delete(
        {
          index: backingIndex,
          id: kiId,
          refresh: 'wait_for',
        },
        { signal: context.abortSignal }
      );

      // The KI may have been removed concurrently between the lookup and the delete.
      if (response.result === 'not_found') {
        throw new ExecutionError({
          type: 'NotFoundError',
          message: `KI '${kiId}' not found in AI index '${aiIndexId}'`,
          details: { aiIndexId, kiId },
        });
      }

      return { output: { id: kiId } };
    },
  });
