/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  ConversationActivityEventType,
  EventActorType,
} from '@kbn/agent-builder-common';
import type { ConversationAccessControl } from '@kbn/agent-builder-common';
import {
  accessControlChangeEvents,
  conversationCreatedEvent,
  diffMetadataKeys,
  metadataUpdatedEvents,
  titleUpdatedEvents,
  userEventActor,
} from './activity_events';

const actor = { type: EventActorType.user, id: 'u1', username: 'alice' };
const envelope = { actor, created_at: '2026-01-01T00:00:00.000Z' };

const accessControlEntry = (id: string, addedAt = '2026-01-01T00:00:00.000Z') => ({
  type: 'user' as const,
  id,
  role: ConversationAccessControlRole.Member,
  added_at: addedAt,
});

const accessControl = (
  mode: ConversationAccessControlMode,
  entries: ConversationAccessControl['entries']
): ConversationAccessControl => ({ access_mode: mode, entries });

describe('userEventActor', () => {
  it('uses the profile id and keeps the username', () => {
    expect(userEventActor({ id: 'profile-1', username: 'alice' })).toEqual({
      type: EventActorType.user,
      id: 'profile-1',
      username: 'alice',
    });
  });

  it('falls back to the username as id', () => {
    expect(userEventActor({ username: 'alice' })).toEqual({
      type: EventActorType.user,
      id: 'alice',
      username: 'alice',
    });
  });
});

describe('conversationCreatedEvent', () => {
  it('stamps a uuid, the envelope and the data', () => {
    const event = conversationCreatedEvent(
      { agent_id: 'agent-1', access_mode: ConversationAccessControlMode.Private },
      envelope
    );
    expect(event).toEqual({
      id: expect.any(String),
      type: ConversationActivityEventType.conversationCreated,
      actor,
      created_at: envelope.created_at,
      data: { agent_id: 'agent-1', access_mode: ConversationAccessControlMode.Private },
    });
    expect(event).not.toHaveProperty('execution_id');
  });

  it('carries the execution id when the envelope names one', () => {
    const event = conversationCreatedEvent(
      { agent_id: 'agent-1', access_mode: ConversationAccessControlMode.Private },
      { ...envelope, execution_id: 'r1::execution' }
    );
    expect(event.execution_id).toBe('r1::execution');
  });
});

describe('titleUpdatedEvents', () => {
  it('returns one event when the title changed', () => {
    const events = titleUpdatedEvents({ previous_title: 'Old', title: 'New' }, envelope);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(ConversationActivityEventType.titleUpdated);
    expect(events[0].data).toEqual({ previous_title: 'Old', title: 'New' });
  });

  it('returns nothing when the title is unchanged', () => {
    expect(titleUpdatedEvents({ previous_title: 'Same', title: 'Same' }, envelope)).toEqual([]);
  });
});

describe('metadataUpdatedEvents', () => {
  it('returns one event listing the changed fields', () => {
    const events = metadataUpdatedEvents(
      { changed_fields: ['status'], template_id: 't1', template_version: 2 },
      envelope
    );
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({
      changed_fields: ['status'],
      template_id: 't1',
      template_version: 2,
    });
  });

  it('returns nothing when no field changed', () => {
    expect(metadataUpdatedEvents({ changed_fields: [] }, envelope)).toEqual([]);
  });
});

describe('diffMetadataKeys', () => {
  it('reports added, changed and removed keys and ignores identical ones', () => {
    expect(
      diffMetadataKeys(
        { same: 'a', changed: 'b', removed: 'c', list: ['x', 'y'] },
        { same: 'a', changed: 'B', added: 'd', list: ['y', 'x'] }
      ).sort()
    ).toEqual(['added', 'changed', 'list', 'removed']);
  });

  it('is empty for identical records', () => {
    expect(diffMetadataKeys({ a: ['1'] }, { a: ['1'] })).toEqual([]);
  });
});

describe('accessControlChangeEvents', () => {
  it('returns nothing when nothing changed, ignoring added_at', () => {
    const previous = accessControl(ConversationAccessControlMode.Private, [
      accessControlEntry('u2', 'then'),
    ]);
    const next = accessControl(ConversationAccessControlMode.Private, [
      accessControlEntry('u2', 'now'),
    ]);
    expect(accessControlChangeEvents({ previous, next }, envelope)).toEqual([]);
  });

  it('reports added participants', () => {
    const previous = accessControl(ConversationAccessControlMode.Private, [
      accessControlEntry('u2'),
    ]);
    const next = accessControl(ConversationAccessControlMode.Private, [
      accessControlEntry('u2'),
      accessControlEntry('u3'),
    ]);
    const events = accessControlChangeEvents({ previous, next }, envelope);
    expect(events.map((event) => event.type)).toEqual([
      ConversationActivityEventType.participantsAdded,
    ]);
    expect(events[0].data).toEqual({
      participants: [{ type: 'user', id: 'u3', role: ConversationAccessControlRole.Member }],
    });
  });

  it('reports removed participants', () => {
    const previous = accessControl(ConversationAccessControlMode.Private, [
      accessControlEntry('u2'),
      accessControlEntry('u3'),
    ]);
    const next = accessControl(ConversationAccessControlMode.Private, [accessControlEntry('u3')]);
    const events = accessControlChangeEvents({ previous, next }, envelope);
    expect(events.map((event) => event.type)).toEqual([
      ConversationActivityEventType.participantsRemoved,
    ]);
    expect(events[0].data).toEqual({
      participants: [{ type: 'user', id: 'u2', role: ConversationAccessControlRole.Member }],
    });
  });

  it('reports a visibility change first, then the participants dropped with it', () => {
    const previous = accessControl(ConversationAccessControlMode.Private, [
      accessControlEntry('u2'),
    ]);
    const next = accessControl(ConversationAccessControlMode.Public, []);
    const events = accessControlChangeEvents({ previous, next }, envelope);
    expect(events.map((event) => event.type)).toEqual([
      ConversationActivityEventType.visibilityUpdated,
      ConversationActivityEventType.participantsRemoved,
    ]);
    expect(events[0].data).toEqual({
      previous_access_mode: ConversationAccessControlMode.Private,
      access_mode: ConversationAccessControlMode.Public,
    });
    expect(events.every((event) => event.actor === actor)).toBe(true);
    expect(events.every((event) => event.created_at === envelope.created_at)).toBe(true);
  });
});
