/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LIGHT_THEME } from '@elastic/charts';
import type { AlertTimelineSeries } from './types';
import { AlertTimelineChart } from './alert_timeline_chart';

jest.mock('./alert_timeline_row', () => ({
  AlertTimelineRow: () => <div data-test-subj="mockAlertTimelineRow" />,
}));

jest.mock('./alert_timeline_time_axis', () => ({
  AlertTimelineTimeAxis: () => <div data-test-subj="mockAlertTimelineTimeAxis" />,
}));

const mockRow: AlertTimelineSeries = {
  groupHash: 'group-1',
  groupingValues: {},
  segments: [],
  transitions: [],
  firstEventMs: 1_000,
  lastEventMs: 2_000,
  hasOpenEpisode: false,
  longestOpenDurationMs: 0,
  episodeCount: 1,
};

describe('AlertTimelineChart', () => {
  it('supports a compact label column while keeping the default available to rule details', () => {
    render(
      <AlertTimelineChart
        rows={[mockRow]}
        windowStartMs={1_000}
        windowEndMs={2_000}
        baseTheme={LIGHT_THEME}
        renderSeriesLabel={() => 'Lifecycle'}
        labelColumnWidth={64}
      />
    );

    expect(getComputedStyle(screen.getByTestId('alertTimelineLabelColumn')).width).toBe('64px');
    expect(getComputedStyle(screen.getByTestId('alertTimelineAxisLabelSpacer')).width).toBe('64px');
  });
});
