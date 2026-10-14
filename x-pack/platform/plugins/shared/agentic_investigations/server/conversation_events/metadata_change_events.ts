/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  AgentBuilderPluginSetup,
  ConversationMetadataPatchedEvent,
  ConversationPublicClient,
  MetadataFieldChange,
} from '@kbn/agent-builder-server';
import {
  ASSIGNEES_CHANGED_EVENT_TYPE,
  type AssigneesChangedEventData,
} from '../../common/assignments/conversation_events';
import {
  ESCALATION_ASSIGNEES_FIELD,
  ESCALATION_STATUS_FIELD,
  ESCALATION_TEMPLATE_ID,
  INVESTIGATION_TEMPLATE_ID,
} from '../../common/escalations/constants';
import {
  STATUS_CHANGED_EVENT_TYPE,
  statusChangedEventSchema,
  type StatusChangedEventData,
} from '../../common/investigations/conversation_events';

const TEMPLATE_IDS: readonly string[] = [INVESTIGATION_TEMPLATE_ID, ESCALATION_TEMPLATE_ID];

/** Serialized metadata arrays can come back as a bare string when they hold a single value. */
const toStringArray = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return typeof value === 'string' ? [value] : [];
};

const toStatusEvent = (
  change: MetadataFieldChange,
  via: StatusChangedEventData['via']
): StatusChangedEventData | undefined => {
  const parsed = statusChangedEventSchema.safeParse({
    from: change.from,
    to: change.to,
    ...(via ? { via } : {}),
  });
  if (parsed.success) return parsed.data;
  // A first write has no previous status; anything else invalid is not a status we can render.
  const retry = statusChangedEventSchema.safeParse({ to: change.to, ...(via ? { via } : {}) });
  return retry.success ? retry.data : undefined;
};

const toAssigneesEvent = (
  change: MetadataFieldChange,
  via: AssigneesChangedEventData['via']
): AssigneesChangedEventData | undefined => {
  const previous = toStringArray(change.from);
  const next = toStringArray(change.to);
  const added = next.filter((uid) => !previous.includes(uid));
  const removed = previous.filter((uid) => !next.includes(uid));
  if (added.length === 0 && removed.length === 0) return undefined;
  return { added, removed, ...(via ? { via } : {}) };
};

/** The timeline events a metadata write of an investigation or escalation produces. */
export const toTimelineEvents = (
  event: ConversationMetadataPatchedEvent
): Array<{ type: string; data: StatusChangedEventData | AssigneesChangedEventData }> => {
  if (!event.templateId || !TEMPLATE_IDS.includes(event.templateId)) return [];

  const events: Array<{
    type: string;
    data: StatusChangedEventData | AssigneesChangedEventData;
  }> = [];

  const statusChange = event.changes[ESCALATION_STATUS_FIELD];
  const status = statusChange && toStatusEvent(statusChange, event.context);
  if (status) events.push({ type: STATUS_CHANGED_EVENT_TYPE, data: status });

  const assigneesChange = event.changes[ESCALATION_ASSIGNEES_FIELD];
  const assignees = assigneesChange && toAssigneesEvent(assigneesChange, event.context);
  if (assignees) events.push({ type: ASSIGNEES_CHANGED_EVENT_TYPE, data: assignees });

  return events;
};

const WRITE_RETRIES = 2;
const WRITE_MIN_TIMEOUT_MS = 100;

const getStatusCode = (error: unknown): number | undefined => {
  const e = error as {
    statusCode?: number;
    output?: { statusCode?: number };
    meta?: { statusCode?: number };
  };
  return e?.statusCode ?? e?.output?.statusCode ?? e?.meta?.statusCode;
};

/** Client errors such as a missing access or conversation will fail the same way again. */
const isPermanentFailure = (error: unknown): boolean => {
  const status = getStatusCode(error);
  return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
};

/**
 * Timeline writes in flight per request. The bus is fire-and-forget, so a route that must respond
 * with the event already on the timeline awaits its own request's writes through
 * `waitForMetadataChangeEvents`. Writes by automation have no route waiting and stay best-effort.
 * Each write retries transient failures, so both kinds benefit.
 */
const pendingWrites = new WeakMap<KibanaRequest, Array<Promise<void>>>();

/** Resolves once the timeline events produced by metadata writes of this request are stored. */
export const waitForMetadataChangeEvents = async (request: KibanaRequest): Promise<void> => {
  const writes = pendingWrites.get(request);
  if (!writes) return;
  pendingWrites.delete(request);
  // The writes handle their own errors, so this never rejects.
  await Promise.all(writes);
};

/**
 * Records status and assignee changes of investigations and escalations on their timeline, however
 * the change was made: UI, API, workflow step or agent run. Registers the status event type and
 * listens to Agent Builder's metadata changes.
 *
 * Best-effort: the event is written after the change, so a failed write (e.g. a user who removed
 * their own access) is logged and never fails the change itself. The listener does not hold up the
 * write; callers that need the event stored before they respond use `waitForMetadataChangeEvents`.
 */
export const registerMetadataChangeEvents = ({
  agentBuilder,
  getConversationClient,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  logger: Logger;
}): void => {
  agentBuilder.conversationEvents.register({
    type: STATUS_CHANGED_EVENT_TYPE,
    payloadSchema: statusChangedEventSchema,
  });

  agentBuilder.conversations.onMetadataPatched((request, event) => {
    const events = toTimelineEvents(event);
    if (events.length === 0) return;

    const write = (async () => {
      try {
        await pRetry(
          async () => {
            try {
              const client = await getConversationClient(request);
              await client.addEvents({ conversationId: event.conversationId, events });
            } catch (error) {
              // Retrying a rejected write can't succeed, so give up at once.
              if (isPermanentFailure(error)) throw new pRetry.AbortError(error as Error);
              throw error;
            }
          },
          { retries: WRITE_RETRIES, minTimeout: WRITE_MIN_TIMEOUT_MS }
        );
      } catch (error) {
        logger.warn(
          `Failed to add metadata change events to ${event.conversationId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    })();
    pendingWrites.set(request, [...(pendingWrites.get(request) ?? []), write]);
  });
};
