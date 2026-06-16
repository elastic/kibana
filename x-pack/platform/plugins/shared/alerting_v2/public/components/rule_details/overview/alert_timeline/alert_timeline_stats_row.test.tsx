/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AlertTimelineSummary } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { AlertTimelineStatsRow } from './alert_timeline_stats_row';

const wrap = (summary: AlertTimelineSummary) =>
  render(
    <I18nProvider>
      <AlertTimelineStatsRow summary={summary} />
    </I18nProvider>
  );

const baseSummary: AlertTimelineSummary = {
  episodesStarted: 12,
  recovered: 8,
  stillOpen: 4,
  medianDurationMs: 3_600_000,
};

describe('AlertTimelineStatsRow', () => {
  it('renders all four stat values', () => {
    wrap(baseSummary);
    expect(screen.getByTestId('alertTimelineStatEpisodesOpen')).toHaveTextContent('4');
    expect(screen.getByTestId('alertTimelineStatEpisodesStarted')).toHaveTextContent('12');
    expect(screen.getByTestId('alertTimelineStatRecovered')).toHaveTextContent('8');
    expect(screen.getByTestId('alertTimelineStatMedianDuration')).toHaveTextContent('1h');
  });

  it('formats duration with hours and minutes', () => {
    wrap({ ...baseSummary, medianDurationMs: 5_400_000 });
    expect(screen.getByTestId('alertTimelineStatMedianDuration')).toHaveTextContent('1h 30m');
  });

  it('formats duration with minutes only when under one hour', () => {
    wrap({ ...baseSummary, medianDurationMs: 900_000 });
    expect(screen.getByTestId('alertTimelineStatMedianDuration')).toHaveTextContent('15m');
  });

  it('shows dash for zero or negative duration', () => {
    wrap({ ...baseSummary, medianDurationMs: 0 });
    expect(screen.getByTestId('alertTimelineStatMedianDuration')).toHaveTextContent('—');
  });

  it('renders zero counts correctly', () => {
    wrap({ episodesStarted: 0, recovered: 0, stillOpen: 0, medianDurationMs: 0 });
    expect(screen.getByTestId('alertTimelineStatEpisodesStarted')).toHaveTextContent('0');
    expect(screen.getByTestId('alertTimelineStatRecovered')).toHaveTextContent('0');
    expect(screen.getByTestId('alertTimelineStatEpisodesOpen')).toHaveTextContent('0');
  });
});
