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
import { discoverySchema } from '@kbn/significant-events-schema';
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
import { discoveryWriteBulkHandler } from './handler';

export const SIGNIFICANT_EVENTS_DISCOVERY_WRITE_TOOL_ID =
  platformSignificantEventsTools.discoveryWrite;

export const discoveryWriteItemSchema = discoverySchema
  .pick({
    kind: true,
    discovery_id: true,
    event_id: true,
    title: true,
    symptom_hypothesis: true,
    summary: true,
    stream_names: true,
    severity: true,
    confidence: true,
    signals: true,
    causal_features: true,
    blast_radius: true,
    previous_discovery_id: true,
    workflow_execution_id: true,
    conversation_id: true,
  })
  .partial({ event_id: true, discovery_id: true })
  .extend({
    dedup_window: z
      .string()
      .default('now-1h')
      .describe(
        'Deduplication window as an ES date math expression (e.g. "now-1h"). Applies only to new events without an explicit event_id: if a kind:discovery document with the same primary stream and detection rule UUIDs already exists within this window, the write is skipped and the existing discovery_id is returned. Continuation writes (explicit event_id) are never deduped. Defaults to "now-1h".'
      ),
  });

export const discoveryWriteSchema = z.object({
  items: z.array(discoveryWriteItemSchema).min(1).max(MAX_BULK_WRITE_ITEMS),
});

export function createDiscoveryWriteTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof discoveryWriteSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof discoveryWriteSchema> = {
    id: SIGNIFICANT_EVENTS_DISCOVERY_WRITE_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Append a batch of discovery documents to the discoveries data stream. The data stream is immutable — each successful item creates a new version; the latest-source pattern resolves to the most recent document per event_id. Submit at most one item per explicit event_id and one new discovery per stream-and-rule fingerprint.

      Use kind "discovery" or "clearance" to record an open investigation event. 
      Use kind "handled" to stamp the event as fully processed after the corresponding significant event has been written.
    `,
    schema: discoveryWriteSchema,
    tags: ['streams', 'significant_events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getDiscoveryClient, licensing } = await getScopedClients({
          request,
        });
        await assertSignificantEventsAccess({ server, licensing });

        const data = await discoveryWriteBulkHandler({
          discoveryClient: getDiscoveryClient(),
          inputs: toolParams.items,
        });

        data.forEach((result) => {
          const input = toolParams.items[result.index];
          if (input === undefined) return;
          const isBulkError = 'reason' in result && result.reason === 'bulk_error';
          trackTelemetryBestEffort({
            logger,
            description: 'discovery_write telemetry',
            track: () =>
              telemetry.trackAgentToolDiscoveryWrite({
                success: !isBulkError,
                kind: input.kind,
                event_id: result.event_id,
                stream_names: input.stream_names,
                written: result.written,
                error_message: isBulkError ? result.error.reason : undefined,
              }),
          });
        });

        return {
          results: [{ type: ToolResultType.other, data: { results: data } }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running discovery_write: ${message}`);

        toolParams.items.forEach((input) => {
          trackTelemetryBestEffort({
            logger,
            description: 'failed discovery_write telemetry',
            track: () =>
              telemetry.trackAgentToolDiscoveryWrite({
                success: false,
                kind: input.kind,
                event_id: input.event_id ?? 'unknown',
                stream_names: input.stream_names,
                written: false,
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
                  'xpack.significantEvents.agentBuilder.tools.discoveryWrite.errorMessage',
                  {
                    defaultMessage: 'Failed to write discovery document: {message}',
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
