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
import { discoveryWriteHandler } from './handler';

export const SIGNIFICANT_EVENTS_DISCOVERY_WRITE_TOOL_ID =
  platformSignificantEventsTools.discoveryWrite;

const discoveryWriteSchema = discoverySchema
  .pick({
    kind: true,
    discovery_slug: true,
    title: true,
    summary: true,
    root_cause: true,
    impact: true,
    rule_names: true,
    stream_names: true,
    criticality: true,
    confidence: true,
    detections: true,
    dependency_edges: true,
    infra_components: true,
    cause_kis: true,
    evidences: true,
    parent_discovery_id: true,
    grouped_discovery_ids: true,
    grouping_rationale: true,
    previous_discovery_id: true,
    workflow_execution_id: true,
    conversation_id: true,
  })
  .partial({ discovery_slug: true })
  .extend({
    dedup_window: z
      .string()
      .default('now-1h')
      .describe(
        'Deduplication window as an ES date math expression (e.g. "now-1h"). Applies only to new episodes with auto-generated slugs: if a document with the same kind and slug already exists within this window, the write is skipped and the existing discovery_id is returned. Continuation and clearance writes (explicit discovery_slug) are never deduped. Defaults to "now-1h".'
      ),
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
      Append a discovery document to the discoveries data stream. The data stream is immutable — each write creates a new version; the latest-source pattern resolves to the most recent document per slug.

      Use kind "discovery" or "clearance" to record an open investigation episode. 
      Use kind "handled" to stamp the episode as fully processed after the corresponding significant event has been written.
    `,
    schema: discoveryWriteSchema,
    tags: ['streams', 'significant_events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({
          request,
        });
        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const data = await discoveryWriteHandler({
          discoveryClient: getDiscoveryClient(),
          input: toolParams,
        });

        telemetry.trackAgentToolDiscoveryWrite({
          success: true,
          kind: toolParams.kind,
          discovery_slug: data.discovery_slug,
          stream_names: toolParams.stream_names,
          written: data.written,
        });

        return {
          results: [{ type: ToolResultType.other, data }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running discovery_write: ${message}`);

        telemetry.trackAgentToolDiscoveryWrite({
          success: false,
          kind: toolParams.kind,
          discovery_slug: toolParams.discovery_slug ?? 'unknown',
          stream_names: toolParams.stream_names,
          written: false,
          error_message: message,
        });

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
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
