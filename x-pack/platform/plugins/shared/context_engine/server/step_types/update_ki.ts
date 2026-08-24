/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { isResponseError } from '@kbn/es-errors';
import { updateKiStepCommonDefinition } from '../../common/step_types/update_ki';
import { errorTypeForTelemetry } from '../telemetry';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  findKiBackingIndex,
  isAbortError,
  kiNotFoundError,
  resolveAiIndex,
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
      await assertContextEngineEnabled(isContextEngineEnabled, request);

      const { ai_index_id: aiIndexId, ki_id: kiId, ki } = context.input;
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

        const response = await esClient
          .update(
            {
              index: backingIndex,
              id: kiId,
              doc: ki,
              refresh: 'wait_for',
            },
            { signal: context.abortSignal }
          )
          .catch((error) => {
            // The KI may have been removed concurrently.
            if (isResponseError(error) && error.statusCode === 404) {
              throw kiNotFoundError(aiIndexId, kiId);
            }
            throw error;
          });

        analyticsService.reportKiWrite({
          action: 'update',
          aiIndexId,
          managed,
          outcome: 'success',
        });
        logger.debug(
          `KI '${kiId}' updated in AI index '${analyticsService.aiIndexIdForTelemetry(
            aiIndexId,
            managed
          )}'`
        );
        return {
          output: {
            id: kiId,
            result: response.result === 'noop' ? ('noop' as const) : ('updated' as const),
          },
        };
      } catch (error) {
        // A cancelled run is not a write failure; report it as aborted.
        const aborted = isAbortError(error);
        const errorType = aborted ? undefined : errorTypeForTelemetry(error);
        analyticsService.reportKiWrite({
          action: 'update',
          aiIndexId,
          managed,
          outcome: aborted ? 'aborted' : 'failure',
          errorType,
        });
        const idForLog = analyticsService.aiIndexIdForTelemetry(aiIndexId, managed);
        logger.debug(
          aborted
            ? `KI update aborted in AI index '${idForLog}'`
            : `KI update failed in AI index '${idForLog}': ${errorType}`
        );
        throw error;
      }
    },
  });
