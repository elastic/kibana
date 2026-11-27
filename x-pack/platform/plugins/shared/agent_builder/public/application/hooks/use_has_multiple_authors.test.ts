/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import type { ConversationEvent } from '@kbn/agent-builder-common';
import { createUserMessageEvent } from '../components/conversations/timeline/items/user_message_event.factory';
import { hasMultipleAuthors } from './use_has_multiple_authors';

const messageFrom = (id: string, type: EventActorType = EventActorType.user): ConversationEvent =>
  createUserMessageEvent({ actor: { type, id } });

describe('hasMultipleAuthors', () => {
  it('is false when there are no events', () => {
    expect(hasMultipleAuthors()).toBe(false);
    expect(hasMultipleAuthors([])).toBe(false);
  });

  it('is false when one person sent every message', () => {
    expect(hasMultipleAuthors([messageFrom('alice'), messageFrom('alice')])).toBe(false);
  });

  it('is true once a second person has sent a message', () => {
    expect(hasMultipleAuthors([messageFrom('alice'), messageFrom('bob')])).toBe(true);
  });

  it('counts a person writing from an external system', () => {
    expect(
      hasMultipleAuthors([messageFrom('alice'), messageFrom('U123', EventActorType.external)])
    ).toBe(true);
  });

  it('ignores events that are not messages from a person', () => {
    const fromAnAgent = messageFrom('agent-1', EventActorType.agent);
    const notAMessage: ConversationEvent = {
      ...messageFrom('bob'),
      type: TimelineEventType.executionStarted,
    };

    expect(hasMultipleAuthors([messageFrom('alice'), fromAnAgent, notAMessage])).toBe(false);
  });
});
