/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { KibanaRequest } from '@kbn/core/server';
import { createAlertEventStepCommonDefinition } from '../../../../common/workflows/steps/create_alert_event_step_common';
import type { AlertEventsClientApi } from '../../../../types';

export function getCreateAlertEventStepDefinition(
  getAlertEventsClient: (request: KibanaRequest) => Promise<AlertEventsClientApi>
) {
  return createServerStepDefinition({
    ...createAlertEventStepCommonDefinition,
    handler: async (context) => {
      const client = await getAlertEventsClient(context.contextManager.getFakeRequest());

      try {
        const result = await client.createAlertEvent(context.input, {
          abortSignal: context.abortSignal,
        });
        return { output: result };
      } catch (error) {
        if (error instanceof ExecutionError) throw error;
        if (error instanceof Error && error.name === 'AbortError') throw error;
        throw new ExecutionError({
          type: 'ApiError',
          message: error instanceof Error ? error.message : 'Failed to create alert event',
          details: error instanceof Error ? { name: error.name, message: error.message } : {},
        });
      }
    },
  });
}
