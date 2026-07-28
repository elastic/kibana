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

export const eventsWriteItemSchema = significantEventSchema
  .pick({
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
  })
  .extend({
    dedup_window: z
      .string()
      .optional()
      .describe(
        dedent`
          Discovery-mode deduplication window as an ES date math expression (e.g. "now-24h").
          Provide this when writing a discovery-agent hypothesis (new event without an explicit
          event_id). If an unresolved (status: pending or open) event with the same primary stream
          and detection rule UUIDs already exists within this window, the write is skipped and the
          existing event_id is returned. Omit for judge writes, continuations with explicit
          event_id, and chat-initiated writes — those use snapshot mode with no dedup.
          When present, the written event's status is forced to "pending" regardless of the
          supplied status — the judge assigns the final status later.
        `
      ),
  })
  .partial({ event_id: true });

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
      Create or version a batch of significant events. Each written item appends a new version
      enriched with event_uuid and previous_event_uuid. Submit at most one item per event_id.

      ## Discovery-agent path
      Supply dedup_window (e.g. "now-24h") and omit event_id for new hypotheses. The tool forces
      status = "pending" automatically (hidden from the default read path until assessment is complete)
      final status). If an unresolved (status: pending or open) event with the same primary stream
      and detection rule UUIDs already exists within the window, the write is skipped and the
      existing event_id is returned (written: false, reason: duplicate_within_window).
      For continuation writes of an existing episode, supply the explicit event_id with
      dedup_window — signals and topology are merged with prior versions.

      ## Judge path
      Supply event_id and the final status (open/closed/dismissed). Omit dedup_window — no dedup or
      episode merge is applied. The judge's write promotes the pending hypothesis to its final
      status.

      ## Chat / event_create path
      Omit event_id and dedup_window. A synthetic event_id is generated. Use event_create for
      simpler standalone events not linked to detections.
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
          const isSkipped = !result.written && 'skipped' in result;
          const isBulkError = !result.written && 'error' in result;
          trackTelemetryBestEffort({
            logger,
            description: 'events_write telemetry',
            track: () =>
              telemetry.trackAgentToolEventsWrite({
                success: result.written || isSkipped,
                event_id: result.event_id ?? 'unknown',
                status: result.status,
                written: result.written,
                stream_names: input.stream_names,
                error_message: isBulkError ? result.error.reason : undefined,
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
                event_id: input.event_id ?? 'unknown',
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
