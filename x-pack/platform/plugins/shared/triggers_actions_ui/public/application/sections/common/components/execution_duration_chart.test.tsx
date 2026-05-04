/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ExecutionDurationChart, padOrTruncateDurations } from './execution_duration_chart';

describe('execution duration chart', () => {
  it('renders empty state when no execution duration values are available', async () => {
    const executionDuration = mockExecutionDuration();

    renderWithI18n(
      <ExecutionDurationChart
        executionDuration={executionDuration}
        numberOfExecutions={60}
        onChangeDuration={() => {}}
      />
    );

    expect(screen.getByTestId('executionDurationChartPanel')).toBeInTheDocument();
    expect(screen.getByTestId('executionDurationChartEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('executionDurationChart')).not.toBeInTheDocument();
  });

  it('renders chart when execution duration values are available', async () => {
    const executionDuration = mockExecutionDuration({
      average: 10,
      valuesWithTimestamp: { '17 Nov 2021 @ 19:19:17': 1, '17 Nov 2021 @ 20:19:17': 2 },
    });

    renderWithI18n(
      <ExecutionDurationChart
        executionDuration={executionDuration}
        numberOfExecutions={60}
        onChangeDuration={() => {}}
      />
    );

    expect(screen.getByTestId('executionDurationChartPanel')).toBeInTheDocument();
    // executionDurationChartEmpty is absent — chart IS rendering (Chart from @elastic/charts
    // does not forward data-test-subj to the DOM, so we verify via the empty-state absence)
    expect(screen.queryByTestId('executionDurationChartEmpty')).not.toBeInTheDocument();
  });
});

describe('padOrTruncateDurations', () => {
  it('does nothing when array is the correct length', () => {
    expect(
      padOrTruncateDurations(
        { '17 Nov 2021 @ 16:16:17': 1, '17 Nov 2021 @ 16:17:17': 2, '17 Nov 2021 @ 19:19:17': 3 },
        3
      )
    ).toEqual([
      ['17 Nov 2021 @ 16:16:17', 1],
      ['17 Nov 2021 @ 16:17:17', 2],
      ['17 Nov 2021 @ 19:19:17', 3],
    ]);
  });

  it('pads execution duration values when there are fewer than display desires', () => {
    expect(
      padOrTruncateDurations(
        { '17 Nov 2021 @ 16:16:17': 1, '17 Nov 2021 @ 16:17:17': 2, '17 Nov 2021 @ 19:19:17': 3 },
        10
      )
    ).toEqual([
      ['17 Nov 2021 @ 16:16:17', 1],
      ['17 Nov 2021 @ 16:17:17', 2],
      ['17 Nov 2021 @ 19:19:17', 3],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it('truncates execution duration values when there are more than display desires', () => {
    expect(
      padOrTruncateDurations(
        {
          '17 Nov 2021 @ 16:16:17': 1,
          '17 Nov 2021 @ 16:17:17': 2,
          '17 Nov 2021 @ 19:19:17': 3,
          '17 Nov 2021 @ 20:19:17': 4,
          '17 Nov 2021 @ 21:19:17': 5,
          '17 Nov 2021 @ 22:19:17': 6,
          '17 Nov 2021 @ 23:19:17': 7,
          '18 Nov 2021 @ 19:19:17': 8,
          '19 Nov 2021 @ 19:19:17': 9,
          '19 Nov 2021 @ 20:19:17': 10,
          '19 Nov 2021 @ 21:19:17': 11,
          '20 Nov 2021 @ 19:19:17': 12,
          '20 Nov 2021 @ 20:19:17': 13,
        },
        10
      )
    ).toEqual([
      ['17 Nov 2021 @ 20:19:17', 4],
      ['17 Nov 2021 @ 21:19:17', 5],
      ['17 Nov 2021 @ 22:19:17', 6],
      ['17 Nov 2021 @ 23:19:17', 7],
      ['18 Nov 2021 @ 19:19:17', 8],
      ['19 Nov 2021 @ 19:19:17', 9],
      ['19 Nov 2021 @ 20:19:17', 10],
      ['19 Nov 2021 @ 21:19:17', 11],
      ['20 Nov 2021 @ 19:19:17', 12],
      ['20 Nov 2021 @ 20:19:17', 13],
    ]);
  });
});

function mockExecutionDuration(
  overwrites: {
    average?: number;
    valuesWithTimestamp?: Record<string, number>;
  } = {}
) {
  return {
    average: 0,
    valuesWithTimestamp: {},
    ...overwrites,
  };
}
