/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/**
 * Records status and assignee changes of investigations and escalations on their timeline, however
 * the change was made: UI, API, workflow step or agent run. Registers the status event type and
 * listens to Agent Builder's metadata changes.
 *
 * Best-effort: the event is written after the change, so a failed write (e.g. a user who removed
 * their own access) is logged and never fails the change itself.
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

    void (async () => {
      try {
        const client = await getConversationClient(request);
        await client.addEvents({ conversationId: event.conversationId, events });
      } catch (error) {
        logger.warn(
          `Failed to add metadata change events to ${event.conversationId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    })();
  });
};
