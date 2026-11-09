/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import { isSnoozed } from '../../../action_policy/is_snoozed';
import { useRerenderWhenSnoozeExpires } from './use_rerender_when_snooze_expires';

const buildItem = (snoozedUntil: string): MatchedActionPolicy =>
  ({
    action_policy: { id: 'policy-1', snoozed_until: snoozedUntil },
    category: 'tags',
  } as MatchedActionPolicy);

const Probe = ({ item }: { item: MatchedActionPolicy }) => {
  useRerenderWhenSnoozeExpires([item]);
  return <span>{isSnoozed(item.action_policy.snoozed_until) ? 'snoozed' : 'active'}</span>;
};

describe('useRerenderWhenSnoozeExpires', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears the snoozed state when the expiry is reached', () => {
    jest.useFakeTimers();
    const item = buildItem(new Date(Date.now() + 5_000).toISOString());

    render(<Probe item={item} />);

    expect(screen.getByText('snoozed')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(screen.getByText('active')).toBeInTheDocument();
  });
});
