/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { significantEventSchema } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../../../routes/types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import {
  getBulkWriteToolErrorCode,
  MAX_BULK_WRITE_ITEMS,
  trackTelemetryBestEffort,
} from '../bulk_write';
import { eventsWriteBulkHandler } from './handler';

export const SIGNIFICANT_EVENTS_EVENTS_WRITE_TOOL_ID = platformSignificantEventsTools.eventsWrite;

export const eventsWriteItemSchema = significantEventSchema.pick({
  event_id: true,
  discovery_id: true,
  status: true,
  stream_names: true,
  title: true,
  symptom_hypothesis: true,
  summary: true,
  severity: true,
  confidence: true,
  assessment_note: true,
  signals: true,
  causal_features: true,
  blast_radius: true,
  workflow_execution_id: true,
  conversation_id: true,
});

export const eventsWriteSchema = z.object({
  items: z.array(eventsWriteItemSchema).min(1).max(MAX_BULK_WRITE_ITEMS),
});

export function createEventsWriteTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof eventsWriteSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof eventsWriteSchema> = {
    id: SIGNIFICANT_EVENTS_EVENTS_WRITE_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Create or version a batch of significant events linked to discoveries. Each item appends a new event version and is enriched with event_uuid and previous_event_uuid. Submit at most one item per event_id. Standalone events not tied to a discovery use event_create instead.
    `,
    schema: eventsWriteSchema,
    tags: ['streams', 'significant_events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getEventClient, licensing } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing });

        const data = await eventsWriteBulkHandler({
          eventClient: getEventClient(),
          inputs: toolParams.items,
        });

        data.forEach((result) => {
          const input = toolParams.items[result.index];
          if (input === undefined) return;
          trackTelemetryBestEffort({
            logger,
            description: 'events_write telemetry',
            track: () =>
              telemetry.trackAgentToolEventsWrite({
                success: result.written,
                event_id: result.event_id,
                status: result.status,
                written: result.written,
                stream_names: input.stream_names,
                error_message: result.written ? undefined : result.error.reason,
              }),
          });
        });

        return {
          results: [{ type: ToolResultType.other, data: { results: data } }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running events_write: ${message}`);
        toolParams.items.forEach((input) => {
          trackTelemetryBestEffort({
            logger,
            description: 'failed events_write telemetry',
            track: () =>
              telemetry.trackAgentToolEventsWrite({
                success: false,
                event_id: input.event_id,
                status: input.status,
                written: false,
                stream_names: input.stream_names,
                error_message: message,
              }),
          });
        });
        const code = getBulkWriteToolErrorCode(error instanceof Error ? error : new Error(message));
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                code,
                retryable: false,
                message: i18n.translate(
                  'xpack.significantEvents.agentBuilder.tools.eventsWrite.errorMessage',
                  {
                    defaultMessage: 'Failed to write significant event: {message}',
                    values: { message },
                  }
                ),
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
