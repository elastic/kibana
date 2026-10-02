/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEvent } from '@kbn/agent-builder-common';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common/chat/access_control';
import type { ConversationWriteSnapshot } from './describe_conversation_write';
import { describeConversationWrite } from './describe_conversation_write';

const snapshot = (parts: Partial<ConversationWriteSnapshot> = {}): ConversationWriteSnapshot => ({
  id: 'conv-1',
  title: 'Investigation',
  events: [],
  attachments: [],
  metadata: {},
  ...parts,
});

const event = (
  id: string,
  type: string,
  actorType: EventActorType = EventActorType.user,
  extra: Partial<ConversationEvent> = {}
): ConversationEvent => ({
  id,
  type,
  created_at: '2026-09-29T10:00:00.000Z',
  actor: { type: actorType, id: 'actor-1' },
  data: {},
  ...extra,
});

const attachment = (id: string, parts: Partial<VersionedAttachment> = {}): VersionedAttachment => ({
  id,
  type: 'text',
  versions: [
    { version: 1, data: 'v1', created_at: '2026-09-29T10:00:00.000Z', content_hash: 'h1' },
  ],
  current_version: 1,
  ...parts,
});

const member = (id: string) => ({
  type: 'user' as const,
  id,
  role: ConversationAccessControlRole.Member,
  added_at: '2026-09-29T10:00:00.000Z',
});

describe('describeConversationWrite', () => {
  it('returns undefined when nothing observable changed', () => {
    const before = snapshot({ events: [event('e1', TimelineEventType.userMessage)] });
    expect(
      describeConversationWrite({ before, after: before, source: 'http_api' })
    ).toBeUndefined();
  });

  it('reports only events whose id was not stored before the write', () => {
    const stored = event('r1::user_message', TimelineEventType.userMessage);
    const rewritten = { ...stored, data: { message: 'rewritten' } };
    const result = describeConversationWrite({
      before: snapshot({ events: [stored] }),
      after: snapshot({
        events: [
          rewritten,
          event('r1::execution_started', TimelineEventType.executionStarted, EventActorType.agent, {
            execution_id: 'exec-1',
          }),
          event('r1::step::0', TimelineEventType.executionStep, EventActorType.agent),
          event('r1::step::1', TimelineEventType.executionStep, EventActorType.agent),
          event(
            'r1::execution_terminated',
            TimelineEventType.executionTerminated,
            EventActorType.agent,
            { execution_id: 'exec-1' }
          ),
        ],
      }),
      source: 'execution',
    });

    expect(result).toEqual({
      conversationId: 'conv-1',
      source: 'execution',
      changeKinds: ['events'],
      eventTypes: ['execution_started', 'execution_step', 'execution_terminated'],
      actorTypes: ['agent'],
      executionId: 'exec-1',
      attachmentTypes: [],
      attachmentIds: [],
      changedFields: [],
    });
  });

  it('takes executionId only from execution lifecycle events', () => {
    const result = describeConversationWrite({
      before: snapshot(),
      after: snapshot({
        events: [event('c1', 'text_note', EventActorType.user, { execution_id: 'forged' })],
      }),
      source: 'http_api',
    });

    expect(result?.executionId).toBeUndefined();
    expect(result?.eventTypes).toEqual(['text_note']);
  });

  it('reports a failed execution through its terminal event', () => {
    const result = describeConversationWrite({
      before: snapshot(),
      after: snapshot({
        events: [
          event('r1::execution_failed', TimelineEventType.executionFailed, EventActorType.agent, {
            execution_id: 'exec-2',
          }),
        ],
      }),
      source: 'execution',
    });

    expect(result?.executionId).toBe('exec-2');
  });

  it('ignores attachment events flagged hidden', () => {
    const hiddenAttachmentEvent = event(
      'r1::attachment_added::h1',
      TimelineEventType.attachmentAdded,
      EventActorType.agent,
      { data: { attachment_id: 'h1', attachment_type: 'screen_context', hidden: true } }
    );

    expect(
      describeConversationWrite({
        before: snapshot(),
        after: snapshot({ events: [hiddenAttachmentEvent] }),
        source: 'execution',
      })
    ).toBeUndefined();

    const mixed = describeConversationWrite({
      before: snapshot(),
      after: snapshot({
        events: [event('r2::user_message', TimelineEventType.userMessage), hiddenAttachmentEvent],
      }),
      source: 'execution',
    });
    expect(mixed?.eventTypes).toEqual(['user_message']);
    expect(mixed?.actorTypes).toEqual(['user']);
  });

  it('reports added, versioned and deleted attachments by id and type', () => {
    const result = describeConversationWrite({
      before: snapshot({ attachments: [attachment('a1'), attachment('a2')] }),
      after: snapshot({
        attachments: [
          attachment('a1', { current_version: 2 }),
          attachment('a2', { active: false }),
          attachment('a3', { type: 'dashboard' }),
        ],
      }),
      source: 'http_api',
    });

    expect(result?.changeKinds).toEqual(['attachments']);
    expect(result?.attachmentIds).toEqual(['a1', 'a2', 'a3']);
    expect(result?.attachmentTypes).toEqual(['text', 'dashboard']);
  });

  it('reports description and origin edits', () => {
    const result = describeConversationWrite({
      before: snapshot({ attachments: [attachment('a1')] }),
      after: snapshot({ attachments: [attachment('a1', { description: 'renamed' })] }),
      source: 'http_api',
    });

    expect(result?.changeKinds).toEqual(['attachments']);
    expect(result?.attachmentIds).toEqual(['a1']);
  });

  it('skips attachments hidden or absent on both sides, and reports one that becomes visible', () => {
    const hiddenOnly = describeConversationWrite({
      before: snapshot({ attachments: [attachment('h1', { hidden: true })] }),
      after: snapshot({
        attachments: [
          attachment('h1', { hidden: true, current_version: 2 }),
          attachment('h2', { hidden: true }),
        ],
      }),
      source: 'execution',
    });
    expect(hiddenOnly).toBeUndefined();

    const revealed = describeConversationWrite({
      before: snapshot({ attachments: [attachment('h1', { hidden: true })] }),
      after: snapshot({ attachments: [attachment('h1', { hidden: false })] }),
      source: 'execution',
    });
    expect(revealed?.attachmentIds).toEqual(['h1']);
  });

  it('does not report attachments that were only reordered', () => {
    const before = snapshot({ attachments: [attachment('a1'), attachment('a2')] });
    const after = snapshot({ attachments: [attachment('a2'), attachment('a1')] });
    expect(describeConversationWrite({ before, after, source: 'http_api' })).toBeUndefined();
  });

  it('reports the names of the metadata fields whose stored value changed, added or removed', () => {
    const result = describeConversationWrite({
      before: snapshot({ metadata: { status: 'open', severity: 'low', region: 'eu' } }),
      after: snapshot({ metadata: { status: 'closed', severity: 'low', verdict: 'benign' } }),
      source: 'http_api',
    });

    expect(result?.changeKinds).toEqual(['metadata']);
    expect(result?.changedFields).toEqual(['status', 'region', 'verdict']);
  });

  it('treats metadata arrays as order-sensitive', () => {
    const result = describeConversationWrite({
      before: snapshot({ metadata: { assignees: ['a', 'b'] } }),
      after: snapshot({ metadata: { assignees: ['b', 'a'] } }),
      source: 'http_api',
    });

    expect(result?.changedFields).toEqual(['assignees']);
  });

  it('reports title and template changes', () => {
    const result = describeConversationWrite({
      before: snapshot({ template_id: 'investigation', template_version: 1 }),
      after: snapshot({ title: 'Renamed', template_id: 'investigation', template_version: 2 }),
      source: 'http_api',
    });

    expect(result?.changeKinds).toEqual(['title', 'template']);
    expect(result?.templateId).toBe('investigation');
  });

  it('reports access mode and membership changes, ignoring added_at and entry order', () => {
    const accessControl = {
      access_mode: ConversationAccessControlMode.Private,
      entries: [member('u1'), member('u2')],
    };

    expect(
      describeConversationWrite({
        before: snapshot({ access_control: accessControl }),
        after: snapshot({
          access_control: {
            ...accessControl,
            entries: [
              { ...member('u2'), added_at: '2026-09-30T10:00:00.000Z' },
              { ...member('u1'), added_at: '2026-09-30T10:00:00.000Z' },
            ],
          },
        }),
        source: 'http_api',
      })
    ).toBeUndefined();

    expect(
      describeConversationWrite({
        before: snapshot({ access_control: accessControl }),
        after: snapshot({ access_control: { ...accessControl, entries: [member('u1')] } }),
        source: 'server_api',
      })?.changeKinds
    ).toEqual(['access']);

    expect(
      describeConversationWrite({
        before: snapshot(),
        after: snapshot({
          access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
        }),
        source: 'http_api',
      })?.changeKinds
    ).toEqual(['access']);
  });

  it('treats a missing access control as private with no entries', () => {
    expect(
      describeConversationWrite({
        before: snapshot(),
        after: snapshot({
          access_control: { access_mode: ConversationAccessControlMode.Private, entries: [] },
        }),
        source: 'http_api',
      })
    ).toBeUndefined();
  });

  it('diffs a create against an empty conversation', () => {
    const result = describeConversationWrite({
      after: snapshot({
        title: 'New conversation',
        template_id: 'investigation',
        template_version: 1,
        metadata: { status: 'open' },
        events: [event('r1::user_message', TimelineEventType.userMessage)],
        parent_conversation: { id: 'parent-1' } as ConversationWriteSnapshot['parent_conversation'],
      }),
      source: 'execution',
    });

    expect(result).toEqual({
      conversationId: 'conv-1',
      templateId: 'investigation',
      parentId: 'parent-1',
      source: 'execution',
      changeKinds: ['events', 'metadata', 'title', 'template'],
      eventTypes: ['user_message'],
      actorTypes: ['user'],
      attachmentTypes: [],
      attachmentIds: [],
      changedFields: ['status'],
    });
  });

  it('reports title for a bare create', () => {
    expect(
      describeConversationWrite({
        after: snapshot({ title: 'New conversation' }),
        source: 'http_api',
      })?.changeKinds
    ).toEqual(['title']);
  });
});
