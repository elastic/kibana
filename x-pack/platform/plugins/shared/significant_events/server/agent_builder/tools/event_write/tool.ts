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
import dedent from 'dedent';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../../../routes/types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { eventsWriteHandler } from './handler';

export const SIGNIFICANT_EVENTS_EVENTS_WRITE_TOOL_ID = platformSignificantEventsTools.eventsWrite;

const eventsWriteSchema = significantEventSchema.pick({
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
        Create or version a significant event for a discovery event. Handles deduplication: looks up the current event version by event_id; if status has not changed, skips the write and returns the existing event_uuid.,
        For events linked to a discovery event via event_id. Standalone events not tied to a discovery event use event_create instead.
    `,
    schema: eventsWriteSchema,
    tags: ['streams', 'significant_events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getEventClient, licensing } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing });

        const data = await eventsWriteHandler({
          eventClient: getEventClient(),
          input: toolParams,
        });

        telemetry.trackAgentToolEventsWrite({
          success: true,
          event_id: data.event_id,
          status: data.status,
          written: data.written,
          stream_names: toolParams.stream_names,
        });

        return {
          results: [{ type: ToolResultType.other, data }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running events_write: ${message}`);
        telemetry.trackAgentToolEventsWrite({
          success: false,
          event_id: toolParams.event_id,
          status: toolParams.status,
          written: false,
          stream_names: toolParams.stream_names,
          error_message: message,
        });
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
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
