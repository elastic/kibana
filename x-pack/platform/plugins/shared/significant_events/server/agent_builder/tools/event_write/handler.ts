/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { type SignificantEvent } from '@kbn/significant-events-schema';
import type { EventClient } from '../../../lib/significant_events/events';
import {
  assertUniqueBulkWriteKeys,
  assertValidBulkWriteSize,
  createBulkWriteItemError,
  createBulkWriteOutcomeUnknownError,
  type CompactBulkError,
  toCompactBulkError,
} from '../bulk_write';

/**
 * Input for writing a significant event document. Derived from the canonical SignificantEvent
 * schema.
 *
 * `event_id` is optional. When absent (chat-initiated path), a synthetic ID is generated
 * (`agent-event-<uuid8>`) and the dedup lookup is skipped.
 *
 * `conversation_id` is the only addition not in the base schema — passed through for traceability.
 */
export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'discovery_id'
  | 'status'
  | 'stream_names'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'severity'
  | 'confidence'
  | 'assessment_note'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'workflow_execution_id'
> & {
  /** Optional — generated as `agent-event-<uuid8>` when absent (chat-initiated path). */
  event_id?: string;
  /** Not in the base SignificantEvent schema — passed through for traceability. */
  conversation_id?: string;
};

export interface EventsWriteResult {
  index: number;
  event_uuid: string;
  event_id: string;
  status: SignificantEvent['status'];
  written: true;
}

export interface EventsWriteFailureResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  reason: 'bulk_error';
  error: CompactBulkError;
}

export type EventsWriteBulkResult = EventsWriteResult | EventsWriteFailureResult;

export async function eventsWriteBulkHandler({
  eventClient,
  inputs,
}: {
  eventClient: EventClient;
  inputs: EventsWriteInput[];
}): Promise<EventsWriteBulkResult[]> {
  assertValidBulkWriteSize(inputs);
  assertUniqueBulkWriteKeys(
    inputs.flatMap((input, index) =>
      input.event_id === undefined ? [] : [{ index, key: input.event_id }]
    ),
    'event_id'
  );

  const explicitEventIds = inputs.flatMap((input) =>
    input.event_id === undefined ? [] : [input.event_id]
  );
  const latestEvents =
    explicitEventIds.length === 0
      ? new Map<string, SignificantEvent>()
      : await eventClient.findLatestByEventIds(explicitEventIds);
  const timestamp = new Date().toISOString();
  const prepared = inputs.map((input, index) => {
    const eventId = input.event_id ?? `agent-event-${uuidv4().slice(0, 8)}`;
    const eventUuid = uuidv4();
    return {
      index,
      eventId,
      eventUuid,
      status: input.status,
      document: {
        ...input,
        '@timestamp': timestamp,
        event_uuid: eventUuid,
        event_id: eventId,
        previous_event_uuid: latestEvents.get(eventId)?.event_uuid,
        // Carry forward investigation lineage when creating a new version of an event.
        // Triage uses this to avoid re-investigating an episode that has already run.
        investigations: latestEvents.get(eventId)?.investigations,
        severity: input.severity,
      },
    };
  });

  let response;
  try {
    response = await eventClient.bulkCreate(
      prepared.map(({ document }) => document),
      // The triage workflow reads the freshly written event immediately after this call.
      { throwOnFail: false, refresh: 'wait_for' }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Elasticsearch transport error';
    throw createBulkWriteOutcomeUnknownError(`Event bulk write outcome is unknown: ${message}`);
  }

  if (response.items.length !== prepared.length || response.items.some((item) => !item.create)) {
    throw createBulkWriteOutcomeUnknownError(
      `Event bulk response did not align with the ${prepared.length} submitted documents`
    );
  }

  return prepared.map(({ index, eventId, eventUuid, status }, responseIndex) => {
    const detail = response.items[responseIndex].create;
    if (detail === undefined) {
      throw createBulkWriteOutcomeUnknownError(
        `Event bulk response item ${responseIndex} did not contain a create result`
      );
    }
    if (detail.error) {
      return {
        index,
        event_id: eventId,
        status,
        written: false,
        reason: 'bulk_error',
        error: toCompactBulkError(detail),
      };
    }
    return {
      index,
      event_uuid: eventUuid,
      event_id: eventId,
      status,
      written: true,
    };
  });
}

export async function eventsWriteHandler({
  eventClient,
  input,
}: {
  eventClient: EventClient;
  input: EventsWriteInput;
}): Promise<EventsWriteResult> {
  const [result] = await eventsWriteBulkHandler({ eventClient, inputs: [input] });
  if (result === undefined) {
    throw createBulkWriteOutcomeUnknownError('Event bulk write did not return a result');
  }
  if (!result.written) {
    throw createBulkWriteItemError(result.error);
  }
  return result;
}
