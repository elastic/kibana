/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { deleteKiStepCommonDefinition } from '../../common/step_types/delete_ki';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  findKiBackingIndex,
  kiNotFoundError,
  resolveAiIndexDest,
} from './helpers';

export const getDeleteKiStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkWritePrivilege,
}: KiStepDependencies) =>
  createServerStepDefinition({
    ...deleteKiStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      await assertContextEngineEnabled(isContextEngineEnabled, request);
      await assertKiWritePrivilege(checkWritePrivilege, request);

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

      // `ignore: [404]` resolves a missing document as `result: 'not_found'`
      // instead of throwing a ResponseError.
      const response = await esClient.delete(
        {
          index: backingIndex,
          id: kiId,
          refresh: 'wait_for',
        },
        { signal: context.abortSignal, ignore: [404] }
      );

      // The KI may have been removed concurrently between the lookup and the delete.
      if (response.result === 'not_found') {
        throw kiNotFoundError(aiIndexId, kiId);
      }

      return { output: { id: kiId } };
    },
  });
