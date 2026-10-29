/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { runEsqlAsyncSearch } from '../../utils/run_esql_async_search';
import {
  createMockServices,
  createQueryClientWrapper,
  createTestQueryClient,
} from '../../hooks/test_utils';
import { AlertEpisodeTimelineHeatmapsSection } from './timeline_heatmaps_section';

jest.mock('../../utils/run_esql_async_search');

// Mock the heavy chart building blocks since the section dynamically imports them.
jest.mock('./episode_alert_timeline', () => ({
  AlertEpisodeAlertTimeline: ({
    statusRows,
    severityRows,
    collapsedEventLimit,
  }: {
    statusRows: unknown[];
    severityRows: unknown[];
    collapsedEventLimit?: number;
  }) => (
    <div data-test-subj="alertingV2EpisodeAlertTimelineMock">
      <span data-test-subj="statusRowCount">{statusRows.length}</span>
      <span data-test-subj="severityRowCount">{severityRows.length}</span>
      <span data-test-subj="collapsedEventLimit">{collapsedEventLimit ?? 'none'}</span>
    </div>
  ),
}));

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const mockServices = createMockServices();

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const renderSection = (ruleId?: string) =>
  render(
    <I18nProvider>
      <AlertEpisodeTimelineHeatmapsSection
        episodeId="ep-1"
        ruleId={ruleId}
        services={mockServices}
      />
    </I18nProvider>,
    { wrapper }
  );

describe('AlertEpisodeTimelineHeatmapsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('passes all episode events to the combined alert timeline', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'severity', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', 'active', 'high']],
    });

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeTimelineHeatmapsSection')).toBeInTheDocument()
    );

    const panel = screen.getByTestId('alertingV2EpisodeTimelineHeatmapsSection');
    expect(panel).toContainElement(screen.getByTestId('alertingV2EpisodeAlertTimelineMock'));
    expect(screen.getByTestId('statusRowCount')).toHaveTextContent('1');
    expect(screen.getByTestId('severityRowCount')).toHaveTextContent('1');
    expect(screen.getByTestId('collapsedEventLimit')).toHaveTextContent('none');
  });

  it('passes collapsed phases when the events query is truncated', async () => {
    const eventsResponse: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'severity', type: 'keyword' },
      ],
      values: [
        ['2024-01-01T00:00:00.000Z', 'active', 'high'],
        ['2024-01-01T00:01:00.000Z', 'active', 'high'],
      ],
    };
    const countResponse: ESQLSearchResponse = {
      columns: [{ name: 'event_count', type: 'long' }],
      values: [[5000]],
    };
    const statusPhasesResponse: ESQLSearchResponse = {
      columns: [
        { name: 'episode.id', type: 'keyword' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'group_hash', type: 'keyword' },
        { name: 'seg_start', type: 'date' },
        { name: 'seg_end', type: 'date' },
        { name: 'event_count', type: 'long' },
      ],
      values: [
        ['ep-1', 'pending', 'g-1', '2024-01-01T00:00:00.000Z', '2024-01-01T00:02:00.000Z', 3],
        ['ep-1', 'active', 'g-1', '2024-01-01T00:03:00.000Z', '2024-01-02T00:00:00.000Z', 4000],
        ['ep-1', 'recovering', 'g-1', '2024-01-01T01:00:00.000Z', '2024-01-02T01:00:00.000Z', 997],
      ],
    };
    const severityPhasesResponse: ESQLSearchResponse = {
      columns: [
        { name: 'episode.id', type: 'keyword' },
        { name: 'severity', type: 'keyword' },
        { name: 'seg_start', type: 'date' },
        { name: 'event_count', type: 'long' },
      ],
      values: [
        ['ep-1', 'high', '2024-01-01T00:00:00.000Z', 3000],
        ['ep-1', 'critical', '2024-01-01T02:00:00.000Z', 2000],
      ],
    };
    runEsqlAsyncSearchMock.mockImplementation(async ({ params: { query } }) => {
      if (query.includes('seg_end')) return statusPhasesResponse;
      if (query.includes('seg_start')) return severityPhasesResponse;
      if (query.includes('event_count')) return countResponse;
      return eventsResponse;
    });

    renderSection('rule-1');

    await waitFor(() => expect(screen.getByTestId('statusRowCount')).toHaveTextContent('3'));
    expect(screen.getByTestId('severityRowCount')).toHaveTextContent('2');
    expect(screen.getByTestId('collapsedEventLimit')).toHaveTextContent('2');
  });

  it('renders the combined timeline when there are no supported severity events', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'severity', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', 'active', null]],
    });

    renderSection();

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeAlertTimelineMock')).toBeInTheDocument()
    );
  });

  it('renders the loading state while events are loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));

    renderSection();

    expect(
      screen
        .getByTestId('alertingV2EpisodeTimelineHeatmapsSectionLoading')
        .querySelector('.euiSkeletonRectangle')
    ).not.toBeNull();
  });

  it('renders an error state when events fail to load', async () => {
    runEsqlAsyncSearchMock.mockRejectedValue(new Error('boom'));

    renderSection();

    await waitFor(() =>
      expect(
        screen.getByTestId('alertingV2EpisodeTimelineHeatmapsSectionError')
      ).toBeInTheDocument()
    );
  });
});
