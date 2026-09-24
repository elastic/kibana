/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  MetadataFieldValue,
  TimelineEvent as AgentBuilderTimelineEvent,
} from '@kbn/agent-builder-common';
import { isTimelineEvent, TimelineEventType, TimelineTriggerType } from '@kbn/agent-builder-common';
import type { Investigation, TimelineEvent } from '../types';
import { TIMELINE_EVENT_LABELS } from './translations';

/**
 * An investigation *is* a templated conversation, so everything below is read off the conversation
 * Agent Builder already resolved rather than fetched again. The `investigation` conversation
 * template declares the metadata fields this reads; see the `agent_builder_platform` plugin.
 */

const readString = (value: MetadataFieldValue | undefined): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * `assignees` is a `TEXT_ARRAY`, but `Investigation.assignee` is singular because the header
 * renders one avatar. The first entry is the one shown until the type carries the whole list.
 */
const readFirstAssignee = (value: MetadataFieldValue | undefined): string | null => {
  if (Array.isArray(value)) {
    return readString(value[0]) ?? null;
  }
  return readString(value) ?? null;
};

/** Returns the full list of assignee uid strings from the metadata, defaulting to `[]`. */
const readAssignees = (value: MetadataFieldValue | undefined): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
};

/**
 * Step events are deliberately dropped: one agent run emits a step per tool call and per reasoning
 * block, which would bury the handful of events an analyst reads a timeline for.
 */
const OMITTED_EVENT_TYPES: ReadonlySet<string> = new Set([TimelineEventType.executionStep]);

const TRIGGER_LABELS: Record<string, string> = {
  [TimelineTriggerType.userMessage]: 'user message',
  [TimelineTriggerType.promptResponse]: 'prompt response',
  [TimelineTriggerType.schedule]: 'schedule',
  [TimelineTriggerType.external]: 'external system',
  [TimelineTriggerType.agentMention]: 'agent mention',
};

/** Falls back to `undefined` for an event whose payload carries nothing worth a line of text. */
const summarize = (event: AgentBuilderTimelineEvent): string | undefined => {
  switch (event.type) {
    case TimelineEventType.userMessage:
      return readString(event.data.message);
    case TimelineEventType.promptResponse:
      return TIMELINE_EVENT_LABELS.promptResponse;
    case TimelineEventType.executionStarted:
      return TIMELINE_EVENT_LABELS.executionStarted(
        TRIGGER_LABELS[event.data.trigger_type] ?? event.data.trigger_type
      );
    case TimelineEventType.executionTerminated:
      return event.data.outcome.type === 'responded'
        ? readString(event.data.outcome.response.message) ??
            TIMELINE_EVENT_LABELS.executionCompleted
        : TIMELINE_EVENT_LABELS.promptRequested;
    case TimelineEventType.executionFailed:
      return TIMELINE_EVENT_LABELS.executionFailed(event.data.error.message);
    case TimelineEventType.executionAborted:
      return TIMELINE_EVENT_LABELS.executionAborted;
    case TimelineEventType.attachmentAdded:
      return TIMELINE_EVENT_LABELS.attachmentAdded(event.data.attachment_type);
    case TimelineEventType.attachmentUpdated:
      return TIMELINE_EVENT_LABELS.attachmentUpdated(event.data.attachment_type);
    case TimelineEventType.attachmentDeleted:
      return TIMELINE_EVENT_LABELS.attachmentDeleted(event.data.attachment_type);
    default:
      return undefined;
  }
};

const toTimelineEvents = (events: Conversation['events']): TimelineEvent[] =>
  (events ?? []).flatMap((event) => {
    // `events` is the open envelope, so it can also carry event types registered by other
    // solutions. Only the built-in ones have a payload this knows how to summarize.
    if (!isTimelineEvent(event) || OMITTED_EVENT_TYPES.has(event.type)) {
      return [];
    }
    const summary = summarize(event);
    if (!summary) {
      return [];
    }
    return [
      {
        id: event.id,
        timestamp: event.created_at,
        type: event.type,
        summary,
        actor: event.actor?.full_name ?? event.actor?.username ?? event.actor?.id ?? null,
      },
    ];
  });

/**
 * Parses the escalation-specific metadata fields from a conversation into a plain object.
 *
 * The field names intentionally duplicate the constants from `agentic_investigations/common`
 * (which cannot be imported from this package without crossing a plugin boundary).
 * See the comment at the top of `escalation_flyout_header.tsx` for the authoritative source.
 */
export const conversationToEscalationHeader = (
  conversation: Conversation
): { status: string; assigneeUids: string[] } => {
  const metadata = conversation.metadata ?? {};
  return {
    // The server treats a missing status as 'open' (escalations_service filters on `not closed`).
    status: readString(metadata.status) ?? 'open',
    assigneeUids: readAssignees(metadata.assignees),
  };
};

/**
 * Projects an Agent Builder conversation into the `Investigation` shape the flyout components read.
 *
 * Fields with no conversation equivalent are deliberately left out rather than invented:
 * - `watch_id` / `watch_tier`   no metadata field declares them.
 * - `affectedSurface`           nothing on the conversation or its template carries it.
 * - `recommendedAction`, `priorityScore`, `recordId`, `primaryActionLabel`
 *                               proposal-queue concepts; a conversation has 0..N proposals.
 * - `pendingProposalCount`      would need a proposals query, which this derivation is not.
 */
export const conversationToInvestigation = (conversation: Conversation): Investigation => {
  const metadata = conversation.metadata ?? {};

  return {
    id: conversation.id,
    conversationId: conversation.id,
    // The flyout only renders for the investigation template, so this is the template it came from.
    template_id: 'investigation',
    title: conversation.title,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    watch_id: '',
    watch_execution_id: readString(metadata.workflow_execution_id) ?? '',
    status: readString(metadata.status),
    severity: readString(metadata.severity),
    assignee: readFirstAssignee(metadata.assignees),
    assignees: readAssignees(metadata.assignees),
    // `summary` is the long form; `description` is the single-line one. Prefer the richer field and
    // fall back, because a template only requires `status`.
    summary: readString(metadata.summary) ?? readString(metadata.description),
    pendingProposalCount: 0,
    events: toTimelineEvents(conversation.events),
  };
};
