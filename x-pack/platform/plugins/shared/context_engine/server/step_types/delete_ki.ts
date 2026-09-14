/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { isResponseError } from '@kbn/es-errors';
import { deleteKiStepCommonDefinition } from '../../common/step_types/delete_ki';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  findKiRevision,
  kiNotFoundError,
  resolveAiIndex,
  withKiWriteTelemetry,
} from './helpers';

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
      const request = context.contextManager.getFakeRequest();
      await assertContextEngineEnabled(isContextEngineEnabled, request);

      const { ai_index_id: aiIndexId, ki_id: kiId } = context.input;
      return withKiWriteTelemetry({
        action: 'delete',
        aiIndexId,
        analyticsService,
        logger,
        run: async (setManaged) => {
          await assertKiWritePrivilege(checkWritePrivilege, request);

          const { dest, managed } = await resolveAiIndex(getAiIndexService, aiIndexId);
          setManaged(managed);
          const esClient = context.contextManager.getScopedEsClient();

          const revision = await findKiRevision({
            esClient,
            aiIndexId,
            dest,
            kiId,
            abortSignal: context.abortSignal,
          });
          if (!revision) {
            throw kiNotFoundError(aiIndexId, kiId);
          }

          await esClient
            .delete(
              {
                index: revision.index,
                id: revision.documentId,
                refresh: 'wait_for',
              },
              { signal: context.abortSignal }
            )
            .catch((error) => {
              // The KI (or its backing index) may have been removed concurrently.
              if (isResponseError(error) && error.statusCode === 404) {
                throw kiNotFoundError(aiIndexId, kiId);
              }
              throw error;
            });

          return { output: { id: kiId } };
        },
      });
    },
  });
