/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniq } from 'lodash';
import type {
  Conversation,
  ConversationAccessControl,
  ConversationChangeKind,
  ConversationEvent,
  ConversationUpdatedTriggerEvent,
  ConversationWriteSource,
} from '@kbn/agent-builder-common';
import {
  TimelineEventType,
  isAttachmentEvent,
  isExecutionTerminalEvent,
  normalizeConversationAccessControl,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

/** The parts of a stored conversation a write description is computed from. */
export type ConversationWriteSnapshot = Pick<
  Conversation,
  | 'id'
  | 'title'
  | 'events'
  | 'attachments'
  | 'metadata'
  | 'template_id'
  | 'template_version'
  | 'access_control'
  | 'parent_conversation'
>;

const isExecutionLifecycleEvent = (event: ConversationEvent): boolean =>
  Boolean(event.execution_id) &&
  (event.type === TimelineEventType.executionStarted || isExecutionTerminalEvent(event));

// Hidden attachments are agent-only, so their events are not reported to subscribers.
const isHiddenAttachmentEvent = (event: ConversationEvent): boolean =>
  isAttachmentEvent(event) && event.data.hidden === true;

const isHiddenOrAbsent = (attachment: VersionedAttachment | undefined): boolean =>
  !attachment || attachment.hidden === true;

const diffAttachments = (
  stored: VersionedAttachment[],
  written: VersionedAttachment[]
): VersionedAttachment[] => {
  const storedById = new Map(stored.map((attachment) => [attachment.id, attachment]));
  const writtenById = new Map(written.map((attachment) => [attachment.id, attachment]));
  return uniq([...storedById.keys(), ...writtenById.keys()]).flatMap((id) => {
    const before = storedById.get(id);
    const after = writtenById.get(id);
    const changed = after ?? before;
    if (!changed || (isHiddenOrAbsent(before) && isHiddenOrAbsent(after))) {
      return [];
    }
    return isEqual(before, after) ? [] : [changed];
  });
};

/**
 * Names of the metadata fields whose serialized value differs. Order-sensitive for arrays on
 * purpose: metadata arrays (e.g. ordered checklists) preserve insertion order.
 */
export const diffMetadata = (
  stored: Record<string, unknown>,
  written: Record<string, unknown>
): string[] =>
  uniq([...Object.keys(stored), ...Object.keys(written)]).filter(
    (key) => JSON.stringify(stored[key]) !== JSON.stringify(written[key])
  );

const accessKey = (accessControl: ConversationAccessControl | undefined): string => {
  const { access_mode: accessMode, entries } = normalizeConversationAccessControl(accessControl);
  const members = entries.map(({ type, id, role }) => `${type}:${id}:${role}`).sort();
  return [accessMode, ...members].join('|');
};

/**
 * Describes what a conversation write changed, for the `ai.conversation.updated` trigger.
 * Returns `undefined` when the write changed nothing a subscriber can observe.
 */
export const describeConversationWrite = ({
  before,
  after,
  source,
}: {
  /** The stored conversation the write started from; omitted for a create. */
  before?: ConversationWriteSnapshot;
  after: ConversationWriteSnapshot;
  source: ConversationWriteSource;
}): ConversationUpdatedTriggerEvent | undefined => {
  const storedEventIds = new Set((before?.events ?? []).map(({ id }) => id));
  const addedEvents = (after.events ?? []).filter(
    (event) => !storedEventIds.has(event.id) && !isHiddenAttachmentEvent(event)
  );
  const changedAttachments = diffAttachments(before?.attachments ?? [], after.attachments ?? []);
  const changedFields = diffMetadata(before?.metadata ?? {}, after.metadata ?? {});

  // A create is diffed against an empty conversation, so it also reports whatever it set.
  const changeKinds: ConversationChangeKind[] = before ? [] : ['created'];
  if (addedEvents.length > 0) {
    changeKinds.push('events');
  }
  if (changedAttachments.length > 0) {
    changeKinds.push('attachments');
  }
  if (changedFields.length > 0) {
    changeKinds.push('metadata');
  }
  if (before?.title !== after.title) {
    changeKinds.push('title');
  }
  if (
    before?.template_id !== after.template_id ||
    before?.template_version !== after.template_version
  ) {
    changeKinds.push('template');
  }
  if (accessKey(before?.access_control) !== accessKey(after.access_control)) {
    changeKinds.push('access');
  }
  if (changeKinds.length === 0) {
    return undefined;
  }

  const executionId = addedEvents.find(isExecutionLifecycleEvent)?.execution_id;
  return {
    conversationId: after.id,
    ...(after.template_id ? { templateId: after.template_id } : {}),
    ...(after.parent_conversation ? { parentId: after.parent_conversation.id } : {}),
    source,
    changeKinds,
    eventTypes: uniq(addedEvents.map(({ type }) => type)),
    actorTypes: uniq(addedEvents.map(({ actor }) => actor.type)),
    ...(executionId ? { executionId } : {}),
    attachmentTypes: uniq(changedAttachments.map(({ type }) => type)),
    attachmentIds: changedAttachments.map(({ id }) => id),
    changedFields,
  };
};
