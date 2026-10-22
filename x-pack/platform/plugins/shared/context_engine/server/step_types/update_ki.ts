/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { updateKiStepCommonDefinition } from '../../common/step_types/update_ki';
import { omitNullKiAttributes } from '../../common/step_types/ki';
import { KiDeletedError, KiNotFoundError } from '../ai_indices/errors';
import { findKiRevision, isKiDeleted, writeKiRevision } from '../ai_indices/ki_revision';
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

            const { result } = await writeKiRevision({
              esClient,
              aiIndexId,
              dest,
              kiId,
              revision,
              changes,
              refresh,
              abortSignal: context.abortSignal,
            });

            return { output: { id: kiId, result } };
          },
        });
      } catch (error) {
        throw toStepError(error, 'Failed to update knowledge indicator');
      }
    },
  });
