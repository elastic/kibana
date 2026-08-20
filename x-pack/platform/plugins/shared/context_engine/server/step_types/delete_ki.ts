/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { isResponseError } from '@kbn/es-errors';
import { deleteKiStepCommonDefinition } from '../../common/step_types/delete_ki';
import { errorTypeForTelemetry } from '../telemetry';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  findKiBackingIndex,
  kiNotFoundError,
  resolveAiIndex,
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
      let managed: boolean | undefined;
      try {
        await assertKiWritePrivilege(checkWritePrivilege, request);

        const { dest, managed: resolvedManaged } = await resolveAiIndex(
          getAiIndexService,
          aiIndexId
        );
        managed = resolvedManaged;
        const esClient = context.contextManager.getScopedEsClient();

        const backingIndex = await findKiBackingIndex({
          esClient,
          aiIndexId,
          destValue: dest.value,
          kiId,
          abortSignal: context.abortSignal,
        });

        await esClient
          .delete(
            {
              index: backingIndex,
              id: kiId,
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

        analyticsService.reportKiWrite({
          action: 'delete',
          aiIndexId,
          managed,
          outcome: 'success',
        });
        logger.debug(
          `KI '${kiId}' deleted from AI index '${analyticsService.aiIndexIdForTelemetry(
            aiIndexId,
            managed
          )}'`
        );
        return { output: { id: kiId } };
      } catch (error) {
        const errorType = errorTypeForTelemetry(error);
        analyticsService.reportKiWrite({
          action: 'delete',
          aiIndexId,
          managed,
          outcome: 'failure',
          errorType,
        });
        logger.debug(
          `KI delete failed in AI index '${analyticsService.aiIndexIdForTelemetry(
            aiIndexId,
            managed
          )}': ${errorType}`
        );
        throw error;
      }
    },
  });
