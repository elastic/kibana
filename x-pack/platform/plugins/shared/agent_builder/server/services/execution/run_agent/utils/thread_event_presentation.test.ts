/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ThreadCreatedEvent,
  ThreadStartedEvent,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import {
  completedRoundTimeline,
  eventsNativeConversation,
  T1,
} from '../../../../test_utils/timeline';
import { eventsForContext, standaloneEvents } from './context_timeline';
import { formatThreadEvent } from './thread_event_presentation';

const actor = { type: EventActorType.user, id: 'u1', username: 'jane' };

const threadStarted: ThreadStartedEvent = {
  id: 'thread-started',
  type: TimelineEventType.threadStarted,
  created_at: T1,
  actor,
  data: { parent_conversation_id: 'parent', parent_title: 'Disk <alerts>' },
};

const threadCreated: ThreadCreatedEvent = {
  id: 'thread-created',
  type: TimelineEventType.threadCreated,
  created_at: T1,
  actor,
  data: { thread_id: 'thread', title: 'Check host-1' },
};

describe('formatThreadEvent', () => {
  it('renders thread_started as the boundary notice, escaping the parent title', () => {
    const rendered = formatThreadEvent(threadStarted);

    expect(rendered).toContain('This conversation is a thread started from another conversation');
    expect(rendered).toContain('Disk &lt;alerts&gt;');
  });

  it('renders thread_created as one notice naming who started it', () => {
    const rendered = formatThreadEvent(threadCreated);

    expect(rendered).toContain('jane started a thread from this conversation');
    expect(rendered).toContain('Check host-1');
  });
});

describe('thread events in the context timeline', () => {
  it('keeps them as standalone events, outside any round', () => {
    const events = [...completedRoundTimeline('r1'), threadStarted] as TimelineEvent[];
    const timeline = eventsForContext(eventsNativeConversation(events));

    expect(timeline).toContainEqual(threadStarted);
    expect(standaloneEvents(timeline)).toEqual([threadStarted]);
  });
});
