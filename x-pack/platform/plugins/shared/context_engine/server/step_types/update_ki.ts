/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { isResponseError } from '@kbn/es-errors';
import { updateKiStepCommonDefinition } from '../../common/step_types/update_ki';
import type { KiStepDependencies } from './helpers';
import {
  appendKiRevision,
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  findKiRevision,
  isKiDeleted,
  kiConflictError,
  kiDeletedError,
  kiNotFoundError,
  kiWriterFromContext,
  resolveAiIndex,
  withKiWriteTelemetry,
} from './helpers';

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
      const request = context.contextManager.getFakeRequest();
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      await assertContextEngineEnabled(isContextEngineEnabled, spaceId);

      const {
        ai_index_id: aiIndexId,
        ki_id: kiId,
        ki,
        lifecycle,
        force = false,
        refresh = false,
      } = context.input;
      return withKiWriteTelemetry({
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
            throw kiNotFoundError(aiIndexId, kiId);
          }
          if (isKiDeleted(revision.source) && !force) {
            throw kiDeletedError(aiIndexId, kiId);
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
              // The KI may have been removed or rewritten concurrently.
              if (isResponseError(error) && error.statusCode === 404) {
                throw kiNotFoundError(aiIndexId, kiId);
              }
              if (isResponseError(error) && error.statusCode === 409) {
                throw kiConflictError(aiIndexId, kiId);
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
    },
  });
