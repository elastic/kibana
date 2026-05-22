/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { render, screen } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchEpisodeEventDataQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_event_data_query';
import { useAlertingEpisodeSourceDataView } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episode_source_data_view';
import { EpisodeMetadataTab } from './episode_metadata_tab';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_event_data_query', () => ({
  useFetchEpisodeEventDataQuery: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episode_source_data_view', () => ({
  useAlertingEpisodeSourceDataView: jest.fn(),
}));

jest.mock('@kbn/discover-utils', () => ({
  buildDataTableRecord: jest.fn((doc) => ({ id: 'mock-id', raw: doc, flattened: {} })),
}));

const mockUseKibana = jest.mocked(useKibana);
const mockUseFetchEpisodeEventDataQuery = jest.mocked(useFetchEpisodeEventDataQuery);
const mockUseAlertingEpisodeSourceDataView = jest.mocked(useAlertingEpisodeSourceDataView);

const mockTableRender = jest.fn(() => <div data-test-subj="mock-doc-viewer-table" />);

const mockServices = {
  data: {},
  dataViews: {},
  http: {},
  uiSettings: {
    get: jest.fn(() => 'YYYY-MM-DD HH:mm:ss'),
  },
  unifiedDocViewer: {
    registry: {
      getAll: () => [{ id: 'doc_view_table', render: mockTableRender }],
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({
    services: mockServices,
  } as unknown as ReturnType<typeof useKibana>);
  mockUseAlertingEpisodeSourceDataView.mockReturnValue({
    value: { id: 'mock-data-view' },
    loading: false,
  } as never);
});

describe('EpisodeMetadataTab', () => {
  it('shows a spinner while loading', () => {
    mockUseFetchEpisodeEventDataQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useFetchEpisodeEventDataQuery>);

    render(<EpisodeMetadataTab episodeId="ep-1" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error message on fetch failure', () => {
    mockUseFetchEpisodeEventDataQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useFetchEpisodeEventDataQuery>);

    render(<EpisodeMetadataTab episodeId="ep-1" />);

    expect(screen.getByText('Failed to load metadata.')).toBeInTheDocument();
  });

  it('shows an empty state when no event data is available', () => {
    mockUseFetchEpisodeEventDataQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useFetchEpisodeEventDataQuery>);

    render(<EpisodeMetadataTab episodeId="ep-1" />);

    expect(screen.getByTestId('alertingV2EpisodeMetadataTabEmpty')).toBeInTheDocument();
    expect(
      screen.getByText('No evaluation data is available for this episode.')
    ).toBeInTheDocument();
  });

  it('calls the doc_view_table render function with hit and dataView', () => {
    const mockData = { threshold_met: true, current_value: 95 };
    mockUseFetchEpisodeEventDataQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: mockData,
        dataTimestamp: '2026-04-29T10:00:00.000Z',
        isStale: false,
      },
    } as unknown as ReturnType<typeof useFetchEpisodeEventDataQuery>);

    render(<EpisodeMetadataTab episodeId="ep-1" />);

    expect(screen.getByTestId('mock-doc-viewer-table')).toBeInTheDocument();
    expect(mockTableRender).toHaveBeenCalledWith(
      expect.objectContaining({
        hit: expect.objectContaining({ id: 'mock-id', raw: { _source: mockData } }),
        dataView: expect.objectContaining({ id: 'mock-data-view' }),
      })
    );
    expect(
      screen.queryByTestId('alertingV2EpisodeMetadataTabStaleCallout')
    ).not.toBeInTheDocument();
  });

  it('shows a stale-data callout when the displayed data is older than the latest event', () => {
    mockUseFetchEpisodeEventDataQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: { threshold_met: true },
        dataTimestamp: '2026-04-29T10:00:00.000Z',
        isStale: true,
      },
    } as unknown as ReturnType<typeof useFetchEpisodeEventDataQuery>);

    render(<EpisodeMetadataTab episodeId="ep-1" />);

    const callout = screen.getByTestId('alertingV2EpisodeMetadataTabStaleCallout');
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent(
      moment('2026-04-29T10:00:00.000Z').format('YYYY-MM-DD HH:mm:ss')
    );
    expect(screen.getByTestId('mock-doc-viewer-table')).toBeInTheDocument();
  });

  it('shows spinner when dataView is not ready', () => {
    mockUseFetchEpisodeEventDataQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: { threshold_met: true },
        dataTimestamp: '2026-04-29T10:00:00.000Z',
        isStale: false,
      },
    } as unknown as ReturnType<typeof useFetchEpisodeEventDataQuery>);
    mockUseAlertingEpisodeSourceDataView.mockReturnValue({
      value: undefined,
      loading: true,
    } as never);

    render(<EpisodeMetadataTab episodeId="ep-1" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('prefers the error state over the loading state when fetch fails', () => {
    mockUseFetchEpisodeEventDataQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useFetchEpisodeEventDataQuery>);
    mockUseAlertingEpisodeSourceDataView.mockReturnValue({
      value: undefined,
      loading: true,
    } as never);

    render(<EpisodeMetadataTab episodeId="ep-1" />);

    expect(screen.getByText('Failed to load metadata.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
