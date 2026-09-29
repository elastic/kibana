/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import React from 'react';
import moment from 'moment';
import { render, screen, act } from '@testing-library/react';
import { RulesListAutoRefresh } from './rules_list_auto_refresh';

const onRefresh = vi.fn();

describe('RulesListAutoRefresh', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the update text correctly', async () => {
    vi.useFakeTimers().setSystemTime(moment('1990-01-01').toDate());

    render(
      <RulesListAutoRefresh lastUpdate={moment('1990-01-01').format()} onRefresh={onRefresh} />
    );

    const lastUpdateText = screen.getByTestId('rulesListAutoRefresh-lastUpdateText');
    expect(lastUpdateText).toHaveTextContent('Updated a few seconds ago');

    await act(async () => {
      vi.advanceTimersByTime(1 * 60 * 1000);
    });

    expect(lastUpdateText).toHaveTextContent('Updated a minute ago');

    await act(async () => {
      vi.advanceTimersByTime(1 * 60 * 1000);
    });

    expect(lastUpdateText).toHaveTextContent('Updated 2 minutes ago');

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
  });

  it('calls onRefresh when it auto refreshes', async () => {
    vi.useFakeTimers().setSystemTime(moment('1990-01-01').toDate());

    render(
      <RulesListAutoRefresh
        lastUpdate={moment('1990-01-01').format()}
        initialUpdateInterval={1000}
        onRefresh={onRefresh}
      />
    );

    expect(onRefresh).toHaveBeenCalledTimes(0);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(10 * 1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(12);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
  });
});
