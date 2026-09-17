/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { TimelineItem } from './to_timeline_items';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { Timeline } from './timeline';

jest.mock('./items/user_message_event', () => ({ UserMessageEvent: () => null }));
jest.mock('./agent_turn', () => ({ AgentTurn: () => null }));

describe('Timeline', () => {
  it('marks each item with its key so the scroll anchor can find it', () => {
    const items: TimelineItem[] = [
      { kind: 'userMessage', key: 'round-1::user_message', event: createUserMessageEvent() },
      {
        kind: 'agentTurn',
        key: 'round-1::execution',
        status: 'completed',
        startedAt: '',
        steps: [],
      },
    ];

    const { container } = render(<Timeline items={items} />);

    expect(
      Array.from(container.querySelectorAll('[data-timeline-item-key]')).map((el) =>
        el.getAttribute('data-timeline-item-key')
      )
    ).toEqual(['round-1::user_message', 'round-1::execution']);
  });
});
