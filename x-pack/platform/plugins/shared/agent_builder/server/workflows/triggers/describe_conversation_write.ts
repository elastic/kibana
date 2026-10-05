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
  type ConversationUpdatedEvent,
} from '@kbn/agent-builder-common';

const EXECUTION_EVENT_TYPES = new Set<string>([
  TimelineEventType.executionStarted,
  TimelineEventType.executionStep,
  TimelineEventType.executionTerminated,
  TimelineEventType.executionFailed,
  TimelineEventType.executionAborted,
]);

/** Metadata field a generated summary is written to. A write of only this field must not retrigger. */
export const SUMMARY_METADATA_FIELD = 'summary';

export interface ConversationWriteDescriptionInput {
  conversationId: string;
  templateId?: string;
  parentId?: string;
  events?: ConversationEvent[];
  changedFields?: string[];
  attributes?: boolean;
}

const isContentEvent = (event: ConversationEvent): boolean => {
  if (!isBuiltInConversationEventType(event.type)) {
    return true;
  }
  return !EXECUTION_EVENT_TYPES.has(event.type);
};

/**
 * Describes one persisted conversation write for the `ai.conversation.updated` trigger.
 * Returns undefined when the write changed nothing a subscriber could observe.
 */
export const describeConversationWrite = ({
  conversationId,
  templateId,
  parentId,
  events = [],
  changedFields = [],
  attributes = false,
}: ConversationWriteDescriptionInput): ConversationUpdatedEvent | undefined => {
  const eventTypes = [...new Set(events.map((event) => event.type))];
  const hasAttachments = events.some((event) => isAttachmentEvent(event));
  const hasEvents = eventTypes.length > 0;
  const hasMetadata = changedFields.length > 0;
  const summaryOnly =
    !hasEvents &&
    !attributes &&
    changedFields.length === 1 &&
    changedFields[0] === SUMMARY_METADATA_FIELD;

  if (!hasEvents && !hasMetadata && !attributes) {
    return undefined;
  }

  const changeKinds: ConversationUpdatedEvent['changeKinds'] = [];
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
    hasMetadata && changedFields.some((field) => field !== SUMMARY_METADATA_FIELD);
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
