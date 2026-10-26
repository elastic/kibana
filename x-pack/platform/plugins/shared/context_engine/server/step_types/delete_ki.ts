/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { deleteKiStepCommonDefinition } from '../../common/step_types/delete_ki';
import { softDeleteKi } from '../ai_indices/ki_write';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  kiWriterFromContext,
  resolveAiIndex,
  withKiWriteTelemetry,
} from './helpers';
import { toStepError } from './to_step_error';

export const getDeleteKiStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkWritePrivilege,
  analyticsService,
  logger,
}: KiStepDependencies) =>
  createServerStepDefinition({
    ...deleteKiStepCommonDefinition,
    handler: async (context) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        await assertContextEngineEnabled(isContextEngineEnabled, spaceId);

        const { ai_index_id: aiIndexId, ki_id: kiId, refresh = false } = context.input;
        return await withKiWriteTelemetry({
          action: 'delete',
          aiIndexId,
          analyticsService,
          logger,
          run: async (setManaged) => {
            await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

            const { dest, managed } = await resolveAiIndex(getAiIndexService, aiIndexId, spaceId);
            setManaged(managed);
            const esClient = context.contextManager.getScopedEsClient();
            const writer = kiWriterFromContext(context.contextManager.getContext());

            const result = await softDeleteKi(esClient, {
              aiIndexId,
              dest,
              kiId,
              writer,
              refresh,
              abortSignal: context.abortSignal,
            });

            return { output: result };
          },
        });
      } catch (error) {
        throw toStepError(error, 'Failed to delete knowledge indicator');
      }
    },
  });
