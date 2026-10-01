/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ConversationActivityEventType, EventActorType } from '@kbn/agent-builder-common';
import type {
  ActivityEvent,
  ConversationAccessControl,
  ConversationCreatedActivityEvent,
  ConversationCreatedActivityEventData,
  ConversationEvent,
  ConversationParticipant,
  EventActor,
  MetadataUpdatedEvent,
  MetadataUpdatedEventData,
  TitleUpdatedEvent,
  TitleUpdatedEventData,
  UserIdAndName,
} from '@kbn/agent-builder-common';

export const userEventActor = ({ id, username }: UserIdAndName): EventActor => ({
  type: EventActorType.user,
  id: id ?? username,
  ...(username ? { username } : {}),
});

/** Attribution stamped on every activity event. */
export interface ActivityEnvelope {
  actor: EventActor;
  created_at: string;
  execution_id?: string;
}

/** Caller-supplied attribution; the client fills in the defaults. */
export interface ActivityContext {
  actor?: EventActor;
  execution_id?: string;
}

function activityEvent<TType extends ConversationActivityEventType, TData extends object>(
  type: TType,
  data: TData,
  activityEnvelope: ActivityEnvelope
): ConversationEvent<TType, TData> {
  return {
    id: uuidv4(),
    type,
    data,
    ...activityEnvelope,
  };
}

export const conversationCreatedEvent = (
  data: ConversationCreatedActivityEventData,
  envelope: ActivityEnvelope
): ConversationCreatedActivityEvent =>
  activityEvent(ConversationActivityEventType.conversationCreated, data, envelope);

/** A `title_updated` event, or none when the title did not change. */
export const titleUpdatedEvents = (
  data: TitleUpdatedEventData,
  envelope: ActivityEnvelope
): TitleUpdatedEvent[] =>
  data.previous_title === data.title
    ? []
    : [activityEvent(ConversationActivityEventType.titleUpdated, data, envelope)];

/** A `metadata_updated` event. Use `metadataUpdatedEvents` to skip no-op changes. */
export const metadataUpdatedEvent = (
  data: MetadataUpdatedEventData,
  envelope: ActivityEnvelope
): MetadataUpdatedEvent =>
  activityEvent(ConversationActivityEventType.metadataUpdated, data, envelope);

/** A `metadata_updated` event, or none when no field changed. */
export const metadataUpdatedEvents = (
  data: MetadataUpdatedEventData,
  envelope: ActivityEnvelope
): MetadataUpdatedEvent[] =>
  data.changed_fields.length === 0 ? [] : [metadataUpdatedEvent(data, envelope)];

/** Keys added, changed or removed between two metadata records. Array order matters (checklists). */
export const diffMetadataKeys = (
  previous: Record<string, unknown>,
  next: Record<string, unknown>
): string[] => {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return Array.from(keys).filter(
    (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key])
  );
};

const participantKey = ({ type, id }: ConversationParticipant) => `${type}:${id}`;

const toParticipant = ({
  type,
  id,
  role,
}: ConversationAccessControl['entries'][number]): ConversationParticipant => ({
  type,
  id,
  role,
});

/**
 * `visibility_updated` when the mode changed, then `participants_added` / `participants_removed`
 * for the entries that differ. A role change counts as removed plus added.
 */
export const accessControlChangeEvents = (
  { previous, next }: { previous: ConversationAccessControl; next: ConversationAccessControl },
  envelope: ActivityEnvelope
): ActivityEvent[] => {
  const events: ActivityEvent[] = [];

  if (previous.access_mode !== next.access_mode) {
    events.push(
      activityEvent(
        ConversationActivityEventType.visibilityUpdated,
        { previous_access_mode: previous.access_mode, access_mode: next.access_mode },
        envelope
      )
    );
  }

  const before = new Map(previous.entries.map((entry) => [participantKey(entry), entry]));
  const after = new Map(next.entries.map((entry) => [participantKey(entry), entry]));

  const added = next.entries
    .filter((entry) => before.get(participantKey(entry))?.role !== entry.role)
    .map(toParticipant);
  const removed = previous.entries
    .filter((entry) => after.get(participantKey(entry))?.role !== entry.role)
    .map(toParticipant);

  if (added.length > 0) {
    events.push(
      activityEvent(
        ConversationActivityEventType.participantsAdded,
        { participants: added },
        envelope
      )
    );
  }
  if (removed.length > 0) {
    events.push(
      activityEvent(
        ConversationActivityEventType.participantsRemoved,
        { participants: removed },
        envelope
      )
    );
  }

  return events;
};
