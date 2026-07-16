/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlLicense } from '../../../common/license';
import type { MlFeatures } from '../../../common/constants/app';
import type { MlAuthorizationService } from '../../lib/capabilities/check_capabilities';
import { hasMlCapabilitiesProvider } from '../../lib/capabilities/check_capabilities';
import { AD_UPDATE_JOB_CONFIG_TOOL_ID } from './tool_ids';

const calendarEventSchema = z.object({
  start_time: z.string().describe('ISO 8601 start time.'),
  end_time: z.string().describe('ISO 8601 end time.'),
  description: z.string().describe('Description of the scheduled event.'),
});

const delayedDataCheckSchema = z.object({
  enabled: z.boolean(),
  check_window: z.string().optional().describe('Duration string, e.g. "2h".'),
});

const schema = z.object({
  operation: z.enum([
    'update_memory_limit',
    'update_query_delay',
    'update_delayed_data_check',
    'create_calendar_event',
  ]),
  job_id: z.string().describe('The anomaly detection job ID.'),
  memory_limit: z
    .string()
    .optional()
    .describe('Required for update_memory_limit. New model memory limit, e.g. "512mb".'),
  query_delay: z
    .string()
    .optional()
    .describe('Required for update_query_delay. New datafeed query delay, e.g. "120s".'),
  delayed_data_check: delayedDataCheckSchema
    .optional()
    .describe('Required for update_delayed_data_check.'),
  calendar_event: calendarEventSchema
    .optional()
    .describe(
      'Single event for create_calendar_event. Prefer calendar_events when adding multiple events.'
    ),
  calendar_events: z
    .array(calendarEventSchema)
    .optional()
    .describe(
      'Required for create_calendar_event (or provide calendar_event). One or more scheduled events to add.'
    ),
  calendar_id: z
    .string()
    .optional()
    .describe(
      'Optional for create_calendar_event. Calendar ID to create or update. Defaults to "calendar-{job_id}".'
    ),
});

const isAlreadyExistsError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const error = err as { statusCode?: number; meta?: { statusCode?: number }; message?: string };
  const statusCode = error.statusCode ?? error.meta?.statusCode;
  if (statusCode === 409) {
    return true;
  }
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('resource_already_exists_exception') || message.includes('already exists')
  );
};

export const createAdUpdateJobConfigTool = (
  resolveMlCapabilities: ResolveMlCapabilities,
  authorization?: MlAuthorizationService,
  mlLicense?: MlLicense,
  enabledFeatures?: MlFeatures
): BuiltinToolDefinition<typeof schema> => ({
  id: AD_UPDATE_JOB_CONFIG_TOOL_ID,
  type: ToolType.builtin,
  tags: ['ml', 'anomaly-detection'],
  description:
    'Update ML job config: memory limit, datafeed query_delay, delayed data check config, or create a calendar event. For create_calendar_event: ensures the calendar exists (PUT), posts events, then associates the calendar with the job.',
  schema,
  handler: async (
    {
      operation,
      job_id: jobId,
      memory_limit,
      query_delay,
      delayed_data_check,
      calendar_event,
      calendar_events,
      calendar_id,
    },
    { esClient, request }
  ) => {
    const hasMlCapabilities = hasMlCapabilitiesProvider(
      resolveMlCapabilities,
      request,
      authorization,
      mlLicense,
      enabledFeatures
    );
    const ml = esClient.asCurrentUser.ml;
    const datafeedId = `datafeed-${jobId}`;

    try {
      switch (operation) {
        case 'update_memory_limit': {
          await hasMlCapabilities(['canUpdateJob']);
          const response = await ml.updateJob({
            job_id: jobId,
            body: { analysis_limits: { model_memory_limit: memory_limit } } as any,
          });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'update_query_delay': {
          await hasMlCapabilities(['canUpdateDatafeed']);
          const response = await ml.updateDatafeed({
            datafeed_id: datafeedId,
            body: { query_delay } as any,
          });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'update_delayed_data_check': {
          await hasMlCapabilities(['canUpdateDatafeed']);
          const response = await ml.updateDatafeed({
            datafeed_id: datafeedId,
            body: { delayed_data_check_config: delayed_data_check } as any,
          });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'create_calendar_event': {
          await hasMlCapabilities(['canCreateCalendar']);
          const events = calendar_events ?? (calendar_event ? [calendar_event] : undefined);
          if (!events?.length) {
            return {
              results: [
                createErrorResult(
                  'calendar_events (or calendar_event) is required for create_calendar_event'
                ),
              ],
            };
          }
          const calendarId = calendar_id ?? `calendar-${jobId}`;

          // 1. Ensure calendar exists (PUT). If it already exists, associate the job and continue.
          let calendarCreated = true;
          try {
            await ml.putCalendar({
              calendar_id: calendarId,
              job_ids: [jobId],
            });
          } catch (err) {
            if (!isAlreadyExistsError(err)) {
              throw err;
            }
            calendarCreated = false;
            await ml.putCalendarJob({
              calendar_id: calendarId,
              job_id: jobId,
            });
          }

          // 2. Post events only after the calendar is confirmed to exist.
          const response = await ml.postCalendarEvents({
            calendar_id: calendarId,
            events,
          });

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  calendar_id: calendarId,
                  calendar_created: calendarCreated,
                  job_id: jobId,
                  ...response,
                },
              },
            ],
          };
        }

        default:
          return {
            results: [createErrorResult(`Unknown operation: ${operation}`)],
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [createErrorResult(`Error executing ${operation}: ${message}`)],
      };
    }
  },
});
