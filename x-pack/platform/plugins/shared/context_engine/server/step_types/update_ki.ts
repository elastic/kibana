/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { isResponseError } from '@kbn/es-errors';
import { updateKiStepCommonDefinition } from '../../common/step_types/update_ki';
import { omitNullKiAttributes } from '../../common/step_types/ki';
import {
  KiConflictError,
  KiDeletedError,
  KiNotFoundError,
} from '../ai_indices/errors';
import {
  appendKiRevision,
  findKiRevision,
  isKiDeleted,
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

export const getUpdateKiStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkWritePrivilege,
  analyticsService,
  logger,
}: KiStepDependencies) =>
  createServerStepDefinition({
    ...updateKiStepCommonDefinition,
    handler: async (context) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        await assertContextEngineEnabled(isContextEngineEnabled, spaceId);

        const {
          ai_index_id: aiIndexId,
          ki_id: kiId,
          lifecycle,
          force = false,
          refresh = false,
        } = context.input;
        const ki = omitNullKiAttributes(context.input.ki);
        return await withKiWriteTelemetry({
          action: 'update',
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
            if (isKiDeleted(revision.source) && !force) {
              throw new KiDeletedError(aiIndexId, kiId);
            }
            if (Object.keys(ki).length === 0 && lifecycle === undefined) {
              return { output: { id: kiId, result: 'noop' as const } };
            }

            const now = new Date().toISOString();
            const writer = kiWriterFromContext(context.contextManager.getContext());
            const changes = {
              ...ki,
              updated_at: now,
              governance: { provenance: { updated_by: writer }, ...(lifecycle && { lifecycle }) },
            };

            if (dest.type === 'data_stream') {
              await appendKiRevision({
                esClient,
                destValue: dest.value,
                kiId,
                source: revision.source,
                changes,
                refresh,
                abortSignal: context.abortSignal,
              });
              return { output: { id: kiId, result: 'updated' as const } };
            }

            const response = await esClient
              .update(
                {
                  index: revision.index,
                  id: revision.documentId,
                  doc: changes,
                  if_seq_no: revision.seqNo,
                  if_primary_term: revision.primaryTerm,
                  ...(refresh && { refresh: 'wait_for' as const }),
                },
                { signal: context.abortSignal }
              )
              .catch((error) => {
                if (isResponseError(error) && error.statusCode === 404) {
                  throw new KiNotFoundError(aiIndexId, kiId);
                }
                if (isResponseError(error) && error.statusCode === 409) {
                  throw new KiConflictError(aiIndexId, kiId);
                }
                throw error;
              });

            return {
              output: {
                id: kiId,
                result: response.result === 'noop' ? ('noop' as const) : ('updated' as const),
              },
            };
          },
        });
      } catch (error) {
        throw toStepError(error, 'Failed to update knowledge indicator');
      }
    },
  });
