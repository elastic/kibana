/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { ApprovalActorTime } from './approval_actor_time';

const NOW = new Date('2026-10-20T12:00:00.000Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('ApprovalActorTime', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each<[string, number, string]>([
    ['seconds', 3_000, '3 sec ago'],
    ['minutes', 5 * 60_000, '5 min ago'],
    ['hours', 2 * 3_600_000, '2 hr ago'],
    ['a day', 24 * 3_600_000, '1 day ago'],
    ['days', 3 * 24 * 3_600_000, '3 days ago'],
  ])('abbreviates %s', (_, elapsed, expected) => {
    renderWithKibanaRenderContext(<ApprovalActorTime actorName="elastic" at={ago(elapsed)} />);

    expect(screen.getByText('elastic')).toBeInTheDocument();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('separates the actor and the time with a dot', () => {
    const { container } = renderWithKibanaRenderContext(
      <ApprovalActorTime actorName="elastic" at={ago(3_000)} />
    );

    expect(container).toHaveTextContent('elastic • 3 sec ago');
  });

  it('shows the full date and time in a tooltip on the time', async () => {
    renderWithKibanaRenderContext(<ApprovalActorTime actorName="elastic" at={ago(3_000)} />);

    fireEvent.mouseOver(screen.getByText('3 sec ago'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/^20 Oct 2026, \d{2}:\d{2}$/);
  });

  it('shows no time and no tooltip when the decision has no time', () => {
    renderWithKibanaRenderContext(<ApprovalActorTime actorName="elastic" />);

    expect(screen.getByText('elastic')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
