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
import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
  significantEventSchema,
} from '@kbn/significant-events-schema';
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
    event_id: z
      .string()
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    dedup_window: z
      .string()
      .max(256)
      .optional()
      .describe(
        dedent`
          Deduplication window as an ES date math expression (e.g. "now-24h"). Mutually exclusive with event_id.

          Provide this to write a new event candidate without an explicit event_id.

          If an active (status "open") event with the same primary stream and detection rule UUIDs already exists within this window, the write is skipped and the existing event_id is returned (written: false). Otherwise a new event is written with the caller-supplied status.
        `
      ),
  })
  .partial({ event_id: true })
  .refine((item) => !(item.dedup_window !== undefined && item.event_id !== undefined), {
    message: 'dedup_window and event_id are mutually exclusive',
  })
  .refine(
    (item) =>
      (item.signals ?? []).every((s) => s.description.length <= MAX_SIGNAL_DESCRIPTION_LENGTH),
    {
      message: `Signal descriptions must be at most ${MAX_SIGNAL_DESCRIPTION_LENGTH} characters for agent input`,
    }
  )
  .refine(
    (item) =>
      item.symptom_hypothesis === undefined ||
      item.symptom_hypothesis.length <= MAX_SYMPTOM_HYPOTHESIS_LENGTH,
    {
      message: `Symptom hypotheses must be at most ${MAX_SYMPTOM_HYPOTHESIS_LENGTH} characters for agent input`,
    }
  )
  .refine((item) => item.summary.length <= MAX_SUMMARY_LENGTH, {
    message: `Summaries must be at most ${MAX_SUMMARY_LENGTH} characters for agent input`,
  })
  .refine(
    (item) =>
      item.assessment_note === undefined ||
      item.assessment_note.length <= MAX_ASSESSMENT_NOTE_LENGTH,
    {
      message: `Assessment notes must be at most ${MAX_ASSESSMENT_NOTE_LENGTH} characters for agent input`,
    }
  );

const eventsWriteItemsSchema = z
  .array(eventsWriteItemSchema)
  .min(1)
  .max(MAX_BULK_WRITE_ITEMS)
  .refine(
    (items) => {
      const ruleUuids = items.flatMap((item) =>
        (item.signals ?? [])
          .filter((signal) => signal.type === 'detection')
          .map((signal) => signal.metadata?.rule_uuid)
          .filter((ruleUuid): ruleUuid is string => Boolean(ruleUuid))
      );
      return new Set(ruleUuids).size === ruleUuids.length;
    },
    {
      message: 'Each detection rule UUID may appear in only one event item per write',
    }
  )
  .describe(
    i18n.translate('xpack.significantEvents.agentBuilder.tools.eventsWrite.schema.items', {
      defaultMessage:
        "The significant event items to write. Provide a complete, non-empty array. Do not call this tool to plan or probe: `'{}'` and `'{ \"items\": [] }'` are invalid. For a new event, omit event_id; for a continuation, supply a non-empty existing event_id.",
    })
  );

export const eventsWriteSchema = z
  .object({
    items: eventsWriteItemsSchema,
  })
  .describe(
    i18n.translate('xpack.significantEvents.agentBuilder.tools.eventsWrite.schema', {
      defaultMessage: 'Bulk-write a batch of significant events.',
    })
  );

export type EventsWriteParams = z.infer<typeof eventsWriteSchema>;

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
      Write a batch of significant events. Submit at most one item per event_id.

      **dedup_window** (e.g. "now-24h"), no event_id: write a new event. Skipped if an open event
      with the same stream and rule UUIDs already exists in the window (written: false,
      reason: duplicate_within_window); otherwise written with the caller-supplied status.

      **event_id**, no dedup_window: append a version to an existing event with the supplied status.
      Signals and topology are merged with prior versions.

      **neither**: a synthetic event_id is generated.
    `,
    schema: eventsWriteSchema,
    tags: ['streams', 'significant-events'],
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
