/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import type { AttachmentChange } from './attachment_state_manager';
import { attachmentChangesToEvents } from './attachment_change_events';

describe('attachmentChangesToEvents', () => {
  const actor = { type: EventActorType.system, id: 'system' };
  const changes: AttachmentChange[] = [
    { kind: 'added', attachment_id: 'a1', attachment_type: 'text', current_version: 1 },
    {
      kind: 'updated',
      attachment_id: 'a2',
      attachment_type: 'text',
      previous_version: 1,
      current_version: 2,
    },
    { kind: 'deleted', attachment_id: 'a3', attachment_type: 'text', hard_delete: true },
  ];

  it('returns one event per change, in order, with the matching type and data', () => {
    const events = attachmentChangesToEvents(changes, { source: 'http_api', actor });
    expect(events.map((e) => e.type)).toEqual([
      TimelineEventType.attachmentAdded,
      TimelineEventType.attachmentUpdated,
      TimelineEventType.attachmentDeleted,
    ]);
    expect(events[0].data).toEqual({
      attachment_id: 'a1',
      attachment_type: 'text',
      current_version: 1,
      render_inline: false,
      source: 'http_api',
    });
    expect(events[1].data).toEqual({
      attachment_id: 'a2',
      attachment_type: 'text',
      previous_version: 1,
      current_version: 2,
      render_inline: false,
      source: 'http_api',
    });
    expect(events[2].data).toEqual({
      attachment_id: 'a3',
      attachment_type: 'text',
      hard_delete: true,
      source: 'http_api',
    });
  });

  it('assigns unique uuid ids that never contain the round-derived delimiter', () => {
    const events = attachmentChangesToEvents(changes, { source: 'workflow', actor });
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(id).not.toContain('::');
    }
  });

  it('applies actor, render_inline, execution_id and created_at from options', () => {
    const [event] = attachmentChangesToEvents([changes[0]], {
      source: 'execution',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      render_inline: true,
      execution_id: 'round-1::execution',
      created_at: '2026-09-16T00:00:00.000Z',
    });
    expect(event.actor).toEqual({ type: EventActorType.agent, id: 'agent-1' });
    expect(event.execution_id).toBe('round-1::execution');
    expect(event.created_at).toBe('2026-09-16T00:00:00.000Z');
    expect(event.data).toMatchObject({ render_inline: true, source: 'execution' });
  });

  it('omits execution_id when not provided and defaults created_at to now', () => {
    const before = Date.now();
    const [event] = attachmentChangesToEvents([changes[0]], { source: 'chat_input', actor });
    expect(event).not.toHaveProperty('execution_id');
    expect(Date.parse(event.created_at)).toBeGreaterThanOrEqual(before);
  });

  it('does not put render_inline on deleted events', () => {
    const [event] = attachmentChangesToEvents([changes[2]], {
      source: 'http_api',
      actor,
      render_inline: true,
    });
    expect(event.data).not.toHaveProperty('render_inline');
  });

  it('returns an empty array for no changes', () => {
    expect(attachmentChangesToEvents([], { source: 'http_api', actor })).toEqual([]);
  });
});
