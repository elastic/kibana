/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { KibanaRequest } from '@kbn/core/server';
import { createAlertEventDataSchema } from '@kbn/alerting-v2-schemas';
import { createAlertEventStepCommonDefinition } from '../../../../common/workflows/steps/create_alert_event_step_common';
import type { AlertEventsClientApi } from '../../../types';

export function getCreateAlertEventStepDefinition(
  getAlertEventsClient: (request: KibanaRequest) => Promise<AlertEventsClientApi>,
  checkAlertWritePrivilege: (request: KibanaRequest) => Promise<boolean>
) {
  return createServerStepDefinition({
    ...createAlertEventStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();

      const canWrite = await checkAlertWritePrivilege(request);
      if (!canWrite) {
        throw new ExecutionError({
          type: 'PermissionError',
          message: 'Insufficient privileges to create alert events',
        });
      }

      const client = await getAlertEventsClient(request);

      try {
        const parsed = createAlertEventDataSchema.parse(context.input);
        const result = await client.createAlertEvent(parsed, {
          abortSignal: context.abortSignal,
        });
        return { output: result };
      } catch (error) {
        if (error instanceof ExecutionError) throw error;
        if (context.abortSignal.aborted) throw error;
        if (error instanceof Error && error.name === 'ZodError') {
          throw new ExecutionError({
            type: 'ValidationError',
            message: error.message,
            details: { name: error.name, message: error.message },
          });
        }
        throw new ExecutionError({
          type: 'ApiError',
          message: error instanceof Error ? error.message : 'Failed to create alert event',
          details: error instanceof Error ? { name: error.name, message: error.message } : {},
        });
      }
    },
  });
}
