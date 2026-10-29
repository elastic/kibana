/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import type {
  EpisodeCollapsedEvents,
  UseFetchEpisodeCollapsedEventsQueryOptions,
} from './use_fetch_episode_collapsed_events_query';
import type { EpisodeEvents } from './use_fetch_episode_events_query';
import { createMockSpaces } from './test_utils';
import { useEpisodeTimelineSourceRows } from './use_episode_timeline_source_rows';

const mockUseFetchEvents = jest.fn<
  { data: EpisodeEvents | undefined; isLoading: boolean; isError: boolean },
  []
>();
const mockUseFetchCollapsedEvents = jest.fn<
  { data: EpisodeCollapsedEvents | undefined; isInitialLoading: boolean },
  [UseFetchEpisodeCollapsedEventsQueryOptions]
>();

jest.mock('./use_fetch_episode_events_query', () => ({
  useFetchEpisodeEventsQuery: () => mockUseFetchEvents(),
}));
jest.mock('./use_fetch_episode_collapsed_events_query', () => ({
  useFetchEpisodeCollapsedEventsQuery: (options: UseFetchEpisodeCollapsedEventsQueryOptions) =>
    mockUseFetchCollapsedEvents(options),
}));

const services = { data: dataPluginMock.createStartContract(), spaces: createMockSpaces() };

const eventRows: EpisodeEventRow[] = [
  {
    '@timestamp': '2024-01-01T00:00:00.000Z',
    'episode.id': 'ep-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'hash-1',
    severity: 'high',
  },
  {
    '@timestamp': '2024-01-01T00:01:00.000Z',
    'episode.id': 'ep-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'hash-1',
    severity: 'high',
  },
];

const collapsedEvents: EpisodeCollapsedEvents = {
  statusRows: [
    {
      '@timestamp': '2024-01-01T00:00:00.000Z',
      'episode.id': 'ep-1',
      'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
      group_hash: 'hash-1',
      event_count: 5000,
    },
  ],
  severityRows: [{ '@timestamp': '2024-01-01T00:00:00.000Z', severity: 'high', event_count: 5000 }],
};

const mockSources = ({
  rows = eventRows,
  totalEventCount = rows.length,
  isLoadingEvents = false,
  isError = false,
  collapsed,
  isLoadingCollapsed = false,
}: {
  rows?: EpisodeEventRow[];
  totalEventCount?: number;
  isLoadingEvents?: boolean;
  isError?: boolean;
  collapsed?: EpisodeCollapsedEvents;
  isLoadingCollapsed?: boolean;
}) => {
  mockUseFetchEvents.mockReturnValue({
    data: isLoadingEvents || isError ? undefined : { eventRows: rows, totalEventCount },
    isLoading: isLoadingEvents,
    isError,
  });
  mockUseFetchCollapsedEvents.mockReturnValue({
    data: collapsed,
    isInitialLoading: isLoadingCollapsed,
  });
};

const renderSourceRows = () =>
  renderHook(() => useEpisodeTimelineSourceRows({ episodeId: 'ep-1', services }));

describe('useEpisodeTimelineSourceRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns every event and keeps the collapsed query disabled when nothing was truncated', () => {
    mockSources({});

    const { result } = renderSourceRows();

    expect(mockUseFetchCollapsedEvents).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: 'ep-1', enabled: false })
    );
    expect(result.current).toEqual({
      statusRows: eventRows,
      severityRows: eventRows,
      isCollapsed: false,
      collapsedEventLimit: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it('returns the collapsed rows and the row limit when the events query was truncated', () => {
    mockSources({ totalEventCount: 5000, collapsed: collapsedEvents });

    const { result } = renderSourceRows();

    expect(mockUseFetchCollapsedEvents).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
    expect(result.current).toEqual({
      statusRows: collapsedEvents.statusRows,
      severityRows: collapsedEvents.severityRows,
      isCollapsed: true,
      collapsedEventLimit: eventRows.length,
      isLoading: false,
      isError: false,
    });
  });

  it('is loading and not yet collapsed while the collapsed rows load', () => {
    mockSources({ totalEventCount: 5000, isLoadingCollapsed: true });

    const { result } = renderSourceRows();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isCollapsed).toBe(false);
    expect(result.current.collapsedEventLimit).toBeUndefined();
  });

  it('falls back to the truncated events without a limit when the collapsed rows are unavailable', () => {
    mockSources({ totalEventCount: 5000 });

    const { result } = renderSourceRows();

    expect(result.current.statusRows).toBe(eventRows);
    expect(result.current.severityRows).toBe(eventRows);
    expect(result.current.isCollapsed).toBe(false);
    expect(result.current.collapsedEventLimit).toBeUndefined();
  });

  it('does not treat the episode as truncated while the events are loading', () => {
    mockSources({ isLoadingEvents: true });

    const { result } = renderSourceRows();

    expect(mockUseFetchCollapsedEvents).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    expect(result.current.isLoading).toBe(true);
    expect(result.current.statusRows).toEqual([]);
  });

  it('forwards an events query error without collapsing', () => {
    mockSources({ isError: true });

    const { result } = renderSourceRows();

    expect(result.current.isError).toBe(true);
    expect(mockUseFetchCollapsedEvents).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });
});
