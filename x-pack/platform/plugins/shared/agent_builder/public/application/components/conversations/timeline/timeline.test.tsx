/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TimelineItem } from './types';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { Timeline } from './timeline';

jest.mock('./items/user_message_event', () => ({ UserMessageEvent: () => null }));
jest.mock('./agent_turn', () => ({
  AgentTurn: ({
    showHeader,
    isGroupLoading,
  }: {
    showHeader?: boolean;
    isGroupLoading?: boolean;
  }) => (
    <div
      data-test-subj="agentTurn"
      data-show-header={String(showHeader)}
      data-group-loading={String(isGroupLoading)}
    />
  ),
}));

describe('Timeline', () => {
  it('marks each item with its key so the scroll anchor can find it', () => {
    const items: TimelineItem[] = [
      { kind: 'userMessage', key: 'round-1::user_message', event: createUserMessageEvent() },
      {
        kind: 'agentTurn',
        key: 'round-1::execution',
        status: 'completed',
        startedAt: '2025-01-01T00:00:10.000Z',
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

  describe('group loading', () => {
    const message = (id: string): TimelineItem => ({
      kind: 'userMessage',
      key: id,
      event: createUserMessageEvent({ id, created_at: '2025-01-01T09:00:00.000Z' }),
    });
    const turn = (key: string, status: 'completed' | 'running'): TimelineItem => ({
      kind: 'agentTurn',
      key,
      status,
      startedAt: '2025-01-01T09:00:10.000Z',
      steps: [],
    });

    const turnFlags = () =>
      screen.getAllByTestId('agentTurn').map((el) => ({
        header: el.getAttribute('data-show-header'),
        loading: el.getAttribute('data-group-loading'),
      }));

    it('spins the header turn of a group while a later grouped turn runs', () => {
      render(<Timeline items={[message('u1'), turn('t1', 'completed'), turn('t2', 'running')]} />);

      expect(turnFlags()).toEqual([
        { header: 'true', loading: 'true' },
        { header: 'false', loading: 'false' },
      ]);
    });

    it('spins the last group while a resume is in flight with no turn yet', () => {
      render(
        <Timeline
          items={[message('u1'), turn('t1', 'completed'), message('u2'), turn('t2', 'completed')]}
          isResuming
        />
      );

      expect(turnFlags()).toEqual([
        { header: 'true', loading: 'false' },
        { header: 'true', loading: 'true' },
      ]);
    });
  });

  describe('date dividers', () => {
    const message = (id: string, createdAt: string): TimelineItem => ({
      kind: 'userMessage',
      key: id,
      event: createUserMessageEvent({ id, created_at: createdAt }),
    });
    const turn = (key: string, startedAt: string): TimelineItem => ({
      kind: 'agentTurn',
      key,
      status: 'completed',
      startedAt,
      steps: [],
    });

    it('draws one divider for items on the same day', () => {
      render(
        <Timeline
          items={[
            message('u1', '2025-01-01T09:00:00.000Z'),
            turn('t1', '2025-01-01T09:00:10.000Z'),
            message('u2', '2025-01-01T17:00:00.000Z'),
          ]}
        />
      );

      expect(screen.getAllByRole('separator')).toHaveLength(1);
    });

    it('draws a divider above the first item of each new day', () => {
      const { container } = render(
        <Timeline
          items={[
            message('u1', '2025-01-01T09:00:00.000Z'),
            turn('t1', '2025-01-01T09:00:10.000Z'),
            message('u2', '2025-01-03T09:00:00.000Z'),
            turn('t2', '2025-01-03T09:00:10.000Z'),
          ]}
        />
      );

      const children = Array.from(container.querySelector('.euiFlexGroup')!.children);
      const kinds = children.map((el) =>
        el.getAttribute('role') === 'separator'
          ? 'divider'
          : el.getAttribute('data-timeline-item-key')
      );
      expect(kinds).toEqual(['divider', 'u1', 't1', 'divider', 'u2', 't2']);
    });

    it('labels a message sent now as today', () => {
      render(<Timeline items={[message('u1', new Date().toISOString())]} />);

      expect(screen.getByRole('separator')).toHaveAttribute('aria-label', 'Today');
    });
  });
});
