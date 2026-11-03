/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import {
  createCompletedTurnItem,
  createStreamingTurnItem,
  createUserMessageItem,
} from './items/timeline_item.factory';
import { reuseUnchangedItems } from './reuse_unchanged_items';
import type { AgentTurnItem, TimelineItem } from './types';

/** The same items as fresh objects, like a rebuild from the events produces. */
const rebuild = (items: TimelineItem[]): TimelineItem[] => structuredClone(items);

const oldMessage = createUserMessageItem({ key: 'round-0::user_message' });
const oldTurn = createCompletedTurnItem({
  key: 'round-0::execution',
  steps: [{ type: ConversationRoundStepType.reasoning, reasoning: 'Checking the index.' }],
  attachmentRefs: [{ attachment_id: 'a-1', version: 1 }],
});
const streamingTurn = createStreamingTurnItem({
  key: 'round-1::execution',
  response: { message: 'Hello' },
});

describe('reuseUnchangedItems', () => {
  it('keeps the previous object of an unchanged item', () => {
    const previous = [oldMessage, oldTurn];

    const next = reuseUnchangedItems(previous, rebuild(previous));

    expect(next[0]).toBe(oldMessage);
    expect(next[1]).toBe(oldTurn);
  });

  it('gives a new object to a turn whose message changed, and keeps its unchanged steps', () => {
    const previous = [oldMessage, oldTurn, streamingTurn];
    const [message, turn, streaming] = rebuild(previous) as [
      TimelineItem,
      TimelineItem,
      AgentTurnItem
    ];

    const next = reuseUnchangedItems(previous, [
      message,
      turn,
      { ...streaming, response: { message: 'Hello world' } },
    ]);

    expect(next[0]).toBe(oldMessage);
    expect(next[1]).toBe(oldTurn);
    expect(next[2]).not.toBe(streamingTurn);
    expect(next[2]).toEqual({ ...streamingTurn, response: { message: 'Hello world' } });
    expect((next[2] as AgentTurnItem).steps).toBe(streamingTurn.steps);
  });

  it('gives a new object to a turn whose steps or status changed', () => {
    const previous = [streamingTurn];
    const [streaming] = rebuild(previous) as [AgentTurnItem];

    const [withStep] = reuseUnchangedItems(previous, [
      {
        ...streaming,
        steps: [
          ...streaming.steps,
          { type: ConversationRoundStepType.reasoning, reasoning: 'One more.' },
        ],
      },
    ]);
    const [completed] = reuseUnchangedItems(previous, [{ ...streaming, status: 'completed' }]);

    expect(withStep).not.toBe(streamingTurn);
    expect(completed).not.toBe(streamingTurn);
  });

  it('matches by key, so a new item does not disturb the ones after it', () => {
    const previous = [oldMessage, oldTurn];
    const newMessage = createUserMessageItem({ key: 'pending::user_message' });

    const next = reuseUnchangedItems(previous, [newMessage, ...rebuild(previous)]);

    expect(next[0]).toBe(newMessage);
    expect(next[1]).toBe(oldMessage);
    expect(next[2]).toBe(oldTurn);
  });
});
