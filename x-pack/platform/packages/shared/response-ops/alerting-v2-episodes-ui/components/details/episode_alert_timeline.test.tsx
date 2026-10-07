/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LIGHT_THEME } from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n-react';
import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type {
  AlertTimelineChartProps,
  EpisodeSeverityTimelineTransition,
} from '../../alert_timeline';
import { AlertEpisodeAlertTimeline } from './episode_alert_timeline';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(() => ({
    services: {
      charts: {
        theme: {
          useChartsBaseTheme: () => ({}),
        },
      },
      uiSettings: {
        get: () => 'UTC',
      },
    },
  })),
}));

jest.mock('../../alert_timeline', () => ({
  ...jest.requireActual('../../alert_timeline'),
  AlertTimelineChart: ({ customRows = [] }: AlertTimelineChartProps) => (
    <div>
      {customRows.map(({ id, label, render: renderRow }) => (
        <div key={id}>
          {label}
          {renderRow({
            windowStartMs: Date.parse('2024-01-01T00:00:00.000Z'),
            windowEndMs: Date.parse('2024-01-01T00:01:00.000Z'),
            height: 44,
            baseTheme: LIGHT_THEME,
            timeZone: 'UTC',
          })}
        </div>
      ))}
    </div>
  ),
  EpisodeSeverityTimelineRow: ({
    transitions,
    onTransitionClick,
  }: {
    transitions: EpisodeSeverityTimelineTransition[];
    onTransitionClick?: (transition: EpisodeSeverityTimelineTransition) => void;
  }) => (
    <button type="button" onClick={() => onTransitionClick?.(transitions[0])}>
      Open severity transition
    </button>
  ),
}));

const createEventRow = (overrides: Partial<EpisodeEventRow> = {}): EpisodeEventRow => ({
  '@timestamp': '2024-01-01T00:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'hash',
  ...overrides,
});

const renderTimeline = (eventRows: EpisodeEventRow[]) =>
  render(
    <I18nProvider>
      <AlertEpisodeAlertTimeline eventRows={eventRows} />
    </I18nProvider>
  );

describe('AlertEpisodeAlertTimeline', () => {
  it('shows severity transitions and opens their event-data preview', () => {
    renderTimeline([
      createEventRow({
        severity: 'high',
        data: JSON.stringify({ host: 'server-1' }),
      }),
    ]);

    expect(screen.getByText('Severity')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open severity transition' }));

    expect(screen.getByTestId('alertingV2EpisodeSeverityHeatmapDetailPanel')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('host')).toBeInTheDocument();
    expect(screen.getByText('server-1')).toBeInTheDocument();
  });

  it('hides the severity lane when no events have a supported severity', () => {
    renderTimeline([createEventRow()]);

    expect(screen.queryByText('Severity')).not.toBeInTheDocument();
  });
});
