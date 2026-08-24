/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createKiStepCommonDefinition } from '../../common/step_types/create_ki';
import { errorTypeForTelemetry } from '../telemetry';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  assertWritableDest,
  isAbortError,
  resolveOrCreateAiIndex,
} from './helpers';

export const getCreateKiStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkWritePrivilege,
  analyticsService,
  logger,
}: KiStepDependencies) =>
  createServerStepDefinition({
    ...createKiStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      await assertContextEngineEnabled(isContextEngineEnabled, request);

      const { ai_index_id: aiIndexId, ki } = context.input;
      let managed: boolean | undefined;
      try {
        await assertKiWritePrivilege(checkWritePrivilege, request);

        const { dest, managed: resolvedManaged } = await resolveOrCreateAiIndex(
          getAiIndexService,
          aiIndexId
        );
        managed = resolvedManaged;
        assertWritableDest(aiIndexId, dest);
        const esClient = context.contextManager.getScopedEsClient();

        const response = await esClient.index(
          {
            index: dest.value,
            document: { '@timestamp': new Date().toISOString(), ...ki },
            // Data streams only accept `create`; `wait_for` makes the KI visible to later steps.
            ...(dest.type === 'data_stream' && { op_type: 'create' as const }),
            refresh: 'wait_for',
          },
          { signal: context.abortSignal }
        );

        analyticsService.reportKiWrite({
          action: 'create',
          aiIndexId,
          managed,
          outcome: 'success',
        });
        logger.debug(
          `KI '${response._id}' created in AI index '${analyticsService.aiIndexIdForTelemetry(
            aiIndexId,
            managed
          )}'`
        );
        return { output: { id: response._id } };
      } catch (error) {
        // A cancelled run is not a write failure; report it as aborted.
        const aborted = isAbortError(error);
        const errorType = aborted ? undefined : errorTypeForTelemetry(error);
        analyticsService.reportKiWrite({
          action: 'create',
          aiIndexId,
          managed,
          outcome: aborted ? 'aborted' : 'failure',
          errorType,
        });
        const idForLog = analyticsService.aiIndexIdForTelemetry(aiIndexId, managed);
        logger.debug(
          aborted
            ? `KI create aborted in AI index '${idForLog}'`
            : `KI create failed in AI index '${idForLog}': ${errorType}`
        );
        throw error;
      }
    },
  });
