/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { EventClient } from '../../../lib/significant_events/events';

/**
 * Input for writing a significant event document. Derived from the canonical SignificantEvent
 * schema.
 *
 * `discovery_slug` is optional. When absent (chat-initiated path), a synthetic slug is generated
 * (`agent-event-<uuid8>`) and the dedup lookup is skipped.
 *
 * `conversation_id` is the only addition not in the base schema — passed through for traceability.
 */
export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'discovery_id'
  | 'status'
  | 'stream_names'
  | 'rule_names'
  | 'title'
  | 'summary'
  | 'root_cause'
  | 'criticality'
  | 'confidence'
  | 'recommendations'
  | 'assessment_note'
  | 'evidences'
  | 'cause_kis'
  | 'dependency_edges'
  | 'infra_components'
  | 'workflow_execution_id'
> & {
  /** Optional — generated as `agent-event-<uuid8>` when absent (chat-initiated path). */
  discovery_slug?: string;
  /** Not in the base SignificantEvent schema — passed through for traceability. */
  conversation_id?: string;
};

export interface EventsWriteResult {
  event_id: string;
  discovery_slug: string;
  status: SignificantEvent['status'];
  written: boolean;
  reason?: string;
}

export async function eventsWriteHandler({
  eventClient,
  input,
}: {
  eventClient: EventClient;
  input: EventsWriteInput;
}): Promise<EventsWriteResult> {
  // Generate a synthetic slug when no discovery episode is linked.
  // Synthetic slugs are always new — skip the dedup lookup.
  const slug = input.discovery_slug || `agent-event-${uuidv4().slice(0, 8)}`;
  const isSynthetic = !input.discovery_slug;

  const latestEvent = isSynthetic ? null : (await eventClient.findLatestBySlugs([slug])).get(slug);

  const now = new Date().toISOString();
  const eventId = uuidv4();

  await eventClient.bulkCreate(
    [
      {
        '@timestamp': now,
        created_at: now,
        event_id: eventId,
        previous_event_id: latestEvent?.event_id,
        discovery_slug: slug,
        discovery_id: input.discovery_id,
        status: input.status,
        stream_names: input.stream_names,
        rule_names: input.rule_names,
        title: input.title,
        summary: input.summary,
        root_cause: input.root_cause,
        criticality: input.criticality,
        confidence: input.confidence,
        recommendations: input.recommendations,
        assessment_note: input.assessment_note,
        evidences: input.evidences,
        cause_kis: input.cause_kis,
        dependency_edges: input.dependency_edges,
        infra_components: input.infra_components,
        workflow_execution_id: input.workflow_execution_id,
        conversation_id: input.conversation_id,
      },
    ],
    { throwOnFail: true }
  );

  return {
    event_id: eventId,
    discovery_slug: slug,
    status: input.status,
    written: true,
  };
}
