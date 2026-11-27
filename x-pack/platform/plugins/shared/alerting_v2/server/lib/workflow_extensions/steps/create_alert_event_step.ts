/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { KibanaRequest } from '@kbn/core/server';
import { createAlertEventDataSchema } from '@kbn/alerting-v2-schemas';
import { createAlertEventStepCommonDefinition } from '../../../../common/workflows/steps/create_alert_event_step_common';
import type { AlertEventsClientApi } from '../../../types';
import { getAuthorizedWriteRequest, throwStepExecutionError } from './event_step_helpers';

export function getCreateAlertEventStepDefinition(
  getAlertEventsClient: (request: KibanaRequest) => Promise<AlertEventsClientApi>,
  checkAlertWritePrivilege: (request: KibanaRequest) => Promise<boolean>
) {
  return createServerStepDefinition({
    ...createAlertEventStepCommonDefinition,
    handler: async (context) => {
      const request = await getAuthorizedWriteRequest(
        context,
        checkAlertWritePrivilege,
        'Insufficient privileges to create alert events'
      );

      const client = await getAlertEventsClient(request);

      try {
        const parsed = createAlertEventDataSchema.parse(context.input);
        const result = await client.createAlertEvent(parsed, {
          abortSignal: context.abortSignal,
        });
        return { output: result };
      } catch (error) {
        return throwStepExecutionError(error, {
          abortSignal: context.abortSignal,
          fallbackMessage: 'Failed to create alert event',
        });
      }
    },
  });
}
