/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TimelineEventType,
  isAttachmentEvent,
  isBuiltInConversationEventType,
  type ConversationEvent,
} from '@kbn/agent-builder-common';

const EXECUTION_EVENT_TYPES = new Set<string>([
  TimelineEventType.executionStarted,
  TimelineEventType.executionStep,
  TimelineEventType.executionTerminated,
  TimelineEventType.executionFailed,
  TimelineEventType.executionAborted,
]);

export const DEFAULT_SUMMARY_FIELD = 'summary';

export type ConversationChangeKind = 'event' | 'attachment' | 'metadata' | 'attributes';

export interface ConversationWriteDescription {
  conversationId: string;
  templateId?: string;
  parentId?: string;
  changeKinds: ConversationChangeKind[];
  eventTypes: string[];
  changedFields: string[];
  contentChange: boolean;
  summaryOnly: boolean;
}

export interface ConversationWriteDescriptionInput {
  conversationId: string;
  templateId?: string;
  parentId?: string;
  events?: ConversationEvent[];
  changedFields?: string[];
  attributes?: boolean;
  /** Metadata field the summarizer writes. A write of only this field must not schedule another run. */
  summaryField?: string;
}

const isContentEvent = (event: ConversationEvent): boolean => {
  if (!isBuiltInConversationEventType(event.type)) {
    return true;
  }
  return !EXECUTION_EVENT_TYPES.has(event.type);
};

/**
 * Describes one persisted conversation write. Returns undefined when nothing observable changed.
 */
export const describeConversationWrite = ({
  conversationId,
  templateId,
  parentId,
  events = [],
  changedFields = [],
  attributes = false,
  summaryField = DEFAULT_SUMMARY_FIELD,
}: ConversationWriteDescriptionInput): ConversationWriteDescription | undefined => {
  const eventTypes = [...new Set(events.map((event) => event.type))];
  const hasAttachments = events.some((event) => isAttachmentEvent(event));
  const hasEvents = eventTypes.length > 0;
  const hasMetadata = changedFields.length > 0;
  const summaryOnly =
    !hasEvents && !attributes && changedFields.length === 1 && changedFields[0] === summaryField;

  if (!hasEvents && !hasMetadata && !attributes) {
    return undefined;
  }

  const changeKinds: ConversationChangeKind[] = [];
  if (hasEvents) {
    changeKinds.push('event');
  }
  if (hasAttachments) {
    changeKinds.push('attachment');
  }
  if (hasMetadata) {
    changeKinds.push('metadata');
  }
  if (attributes) {
    changeKinds.push('attributes');
  }

  const metadataContentChange =
    hasMetadata && changedFields.some((field) => field !== summaryField);
  const contentChange =
    attributes || metadataContentChange || events.some((event) => isContentEvent(event));

  return {
    conversationId,
    ...(templateId ? { templateId } : {}),
    ...(parentId ? { parentId } : {}),
    changeKinds,
    eventTypes,
    changedFields,
    contentChange,
    summaryOnly,
  };
};
