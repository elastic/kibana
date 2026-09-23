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
import type { KnowledgeIndicatorClient } from '../../../lib/knowledge_indicators';
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
      .transform((v) => (v === '' ? undefined : v))
      .describe(
        dedent`
          ID of an existing event to append a new version to (continuation/snapshot mode).

          Omit to trigger find-or-create: the handler scans all currently-active events for one
          whose rule set contains the submitted rules (subset match) and shares at least one
          stream name. If found, the write is skipped and the existing event_id is returned
          (written: false, reason: existing_active_event). Otherwise a new event is created with
          a generated event_id.
          Otherwise a new event is created with a generated event_id.
        `
      ),
  })
  .partial({ event_id: true })
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
  )
  .superRefine((item, ctx) => {
    const signals = item.signals ?? [];
    const grounded = signals.filter((s) => s.evidence != null);
    const hasConfirms = grounded.some((s) => s.verdict === 'confirms');
    const hasOffTopicObservedError = grounded.some((s) => s.verdict === 'off_topic');
    const hasNotChecked = signals.some((s) => s.verdict === 'not_checked');

    if (hasConfirms && hasNotChecked) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'A confirms item cannot include not_checked signals; emit each not_checked detection as its own dismissed item.',
      });
    }
    // Continuations inherit prior severity; this cycle's signals may be
    // inconclusive (telemetry gap, errored query) without a new confirms.
    if (
      item.event_id === undefined &&
      item.status === 'open' &&
      (item.severity === '60-high' || item.severity === '80-critical') &&
      grounded.length > 0 &&
      !hasConfirms &&
      !hasOffTopicObservedError
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'An open event at "60-high" or above whose signals carry query evidence requires at least one confirms or off_topic (observed-error) signal; without confirmed or observed-error evidence use a lower severity or a non-open status.',
      });
    }
  });

const ITEMS_REQUIRED_MESSAGE = 'Pass items as a non-empty array of event objects.';

const eventsWriteItemsSchema = z
  .array(eventsWriteItemSchema, { error: ITEMS_REQUIRED_MESSAGE })
  .min(1, { error: ITEMS_REQUIRED_MESSAGE })
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
      message:
        'Each detection rule UUID may appear exactly once in the complete write, including within a single event item. Correct ownership before the single write; never retry with an empty placeholder.',
    }
  )
  .describe(
    i18n.translate('xpack.significantEvents.agentBuilder.tools.eventsWrite.schema.items', {
      defaultMessage:
        'Non-empty array of event objects. One call assigns every batch detection. Omit event_id only for new events; supply the accepted existing event_id for every continuation. Each detection rule_uuid may appear exactly once in the complete request, including within an item. A confirms item must not include not_checked signals.',
    })
  );

export const eventsWriteSchema = z
  .object({
    source: z
      .literal('discovery')
      .optional()
      .describe(
        'Identifies the caller of this write. Discovery calls must set this to "discovery".'
      ),
    items: eventsWriteItemsSchema,
  })
  .describe(
    i18n.translate('xpack.significantEvents.agentBuilder.tools.eventsWrite.schema', {
      defaultMessage: 'Bulk-write a batch of significant events.',
    })
  );

export type EventsWriteParams = z.infer<typeof eventsWriteSchema>;

const enrichCausalFeatures = async (
  items: EventsWriteParams['items'],
  getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient>,
  logger: Logger
): Promise<EventsWriteParams['items']> => {
  const causalFeatures = items.flatMap(({ causal_features: features = [] }) => features);
  const blastRadiusEntries = items.flatMap(({ blast_radius: entries = [] }) => entries);
  if (causalFeatures.length === 0 && blastRadiusEntries.length === 0) {
    return items;
  }

  try {
    // Stored docs keep the derived uuid in their root `id`, so `id` matches uuid-style
    // references and `featureIds` (feature.slug) matches slug-style ones.
    const references = [...causalFeatures, ...blastRadiusEntries];
    const featureIds = [...new Set(references.map(({ feature_id: featureId }) => featureId))];
    const streamNames = [
      ...new Set([
        ...items.flatMap(({ stream_names: names }) => names),
        ...references.flatMap(({ stream_name: streamName }) => streamName ?? []),
      ]),
    ];
    const kiClient = await getKnowledgeIndicatorClient();
    const hits = (
      await Promise.all([
        kiClient.getFeatures(streamNames, {
          featureIds,
          includeExcluded: true,
          includeExpired: true,
        }),
        kiClient.getFeatures(streamNames, {
          id: featureIds,
          includeExcluded: true,
          includeExpired: true,
        }),
      ])
    ).flatMap(({ hits: featureHits }) => featureHits);
    // Both lookups can return the same indicator; keep one entry per uuid.
    const uniqueHits = [...new Map(hits.map((feature) => [feature.uuid, feature])).values()];
    const featuresByReference = new Map(
      uniqueHits.flatMap((feature) => [
        [`${feature.stream_name}:${feature.id}`, feature] as const,
        [`${feature.stream_name}:${feature.uuid}`, feature] as const,
      ])
    );

    const resolveFeature = (
      featureId: string,
      explicitStream: string | undefined,
      itemStreamNames: string[]
    ) => {
      if (explicitStream !== undefined) {
        return featuresByReference.get(`${explicitStream}:${featureId}`);
      }
      // Without an explicit stream: an unambiguous match wins; otherwise restrict to the
      // event's own streams so a shared slug on another stream cannot stamp the wrong
      // classification.
      const matches = uniqueHits.filter(({ id, uuid }) => id === featureId || uuid === featureId);
      const scoped = matches.filter(({ stream_name }) => itemStreamNames.includes(stream_name));
      return (scoped.length === 1 ? scoped : matches.length === 1 ? matches : [])[0];
    };

    return items.map((item) => ({
      ...item,
      causal_features: item.causal_features?.map((causalFeature) => {
        const feature = resolveFeature(
          causalFeature.feature_id,
          causalFeature.stream_name,
          item.stream_names
        );
        return feature
          ? { ...causalFeature, type: feature.type, subtype: feature.subtype }
          : causalFeature;
      }),
      // Blast radius rows carry their own row-shape discriminator in `type`; only the
      // indicator's subtype is enriched.
      blast_radius: item.blast_radius?.map((entry) => {
        const feature = resolveFeature(entry.feature_id, entry.stream_name, item.stream_names);
        return feature ? { ...entry, subtype: feature.subtype } : entry;
      }),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`Failed to enrich causal features; writing them unenriched: ${message}`);
    return items;
  }
};

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
       Write a batch of significant events. Always pass the completed object
      \`{ "items": [ ... ] }\` with at least one event item. Never pass \`{}\` or
      \`{ "items": [] }\`. If that missing-items argument error occurs, submit the
      already-completed object once. Do not retry a populated payload rejected for
      ownership or field validation.

      Discovery calls must set top-level \`source\` to \`"discovery"\`.

      **With event_id**: append a version to an existing event with the supplied status.
      Signals and topology are merged with prior versions. No-op if severity and status are
      unchanged (written: false, reason: unchanged_outcome). Preserve the prior severity unless
      the discovery procedure establishes a different impact or applies its known-ongoing
      severity cap. When no new rule UUIDs are introduced, title and symptom_hypothesis are
      frozen to the stored values and narrative_preserved: true is returned.

      **Without event_id**: find-or-create. Scans all currently-active events for one whose rule
      set contains the submitted rules and shares at least one stream name. If found, returns it
      without writing (written: false, reason: existing_active_event). Otherwise creates a new
      event with a generated event_id.
    `,
    annotations: {
      title: 'Write Significant Events',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    schema: eventsWriteSchema,
    tags: ['streams', 'significant-events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      try {
        const { getEventClient, getKnowledgeIndicatorClient, licensing } = await getScopedClients({
          request,
        });
        await assertSignificantEventsAccess({ server, licensing });
        const items = await enrichCausalFeatures(
          toolParams.items,
          getKnowledgeIndicatorClient,
          logger
        );

        const data = await eventsWriteBulkHandler({
          eventClient: getEventClient(),
          inputs: items,
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
