/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/logging';
import { createAlertEventStepCommonDefinition } from '../../../../common/workflows/steps/create_alert_event_step_common';
import { AlertEventsClient } from '../../alert_events_client';
import { StorageService } from '../../services/storage_service/storage_service';
import { QueryService } from '../../services/query_service/query_service';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';

function toLoggerService(logger: Logger): LoggerServiceContract {
  return {
    debug: ({ message }) => logger.debug(message),
    info: ({ message }) => logger.info(message),
    warn: ({ message }) => logger.warn(message),
    error: ({ error }) => logger.error(error),
  };
}

export function getCreateAlertEventStepDefinition(getLogger: () => Logger) {
  return createServerStepDefinition({
    ...createAlertEventStepCommonDefinition,
    handler: async (context) => {
      const esClient = context.contextManager.getScopedEsClient();
      const { workflow } = context.contextManager.getContext();
      const loggerService = toLoggerService(getLogger());

      const storageService = new StorageService(esClient, loggerService);
      const queryService = new QueryService(esClient, loggerService);
      const alertEventsClient = new AlertEventsClient(
        storageService,
        queryService,
        workflow.spaceId
      );

      try {
        const result = await alertEventsClient.ingestAlertEvent(context.input, {
          abortSignal: context.abortSignal,
        });
        return { output: result };
      } catch (error) {
        throw new ExecutionError({
          type: 'ApiError',
          message: error instanceof Error ? error.message : 'Failed to create alert event',
          details: error instanceof Error ? { name: error.name, message: error.message } : {},
        });
      }
    },
  });
}
