/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { deleteKiStepCommonDefinition } from '../../common/step_types/delete_ki';
import { KiNotFoundError } from '../ai_indices/errors';
import {
  findKiRevision,
  hardDeleteKiRevision,
  isKiDeleted,
  writeKiRevision,
} from '../ai_indices/ki_revision';
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

            const revision = await findKiRevision({
              esClient,
              aiIndexId,
              dest,
              kiId,
              abortSignal: context.abortSignal,
            });
            if (!revision) {
              throw new KiNotFoundError(aiIndexId, kiId);
            }

            if (dest.type === 'data_stream') {
              if (isKiDeleted(revision.source)) {
                throw new KiNotFoundError(aiIndexId, kiId);
              }
              const now = new Date().toISOString();
              await writeKiRevision({
                esClient,
                aiIndexId,
                dest,
                kiId,
                revision,
                changes: {
                  updated_at: now,
                  governance: {
                    provenance: {
                      updated_by: kiWriterFromContext(context.contextManager.getContext()),
                    },
                    lifecycle: { status: 'deleted' },
                  },
                },
                refresh,
                abortSignal: context.abortSignal,
              });
              return { output: { id: kiId } };
            }

            await hardDeleteKiRevision({
              esClient,
              aiIndexId,
              kiId,
              revision,
              refresh,
              abortSignal: context.abortSignal,
            });

            return { output: { id: kiId } };
          },
        });
      } catch (error) {
        throw toStepError(error, 'Failed to delete knowledge indicator');
      }
    },
  });
