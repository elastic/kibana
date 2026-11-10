/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DataQualityCard } from './data_quality_card';
import {
  createMockWiredStreamDefinition,
  createMockQueryStreamDefinition,
} from '../stream_management/data_management/shared/mocks';

const mockUseStreamDetail = jest.fn();
const mockUseStreamsAppFetch = jest.fn();

jest.mock('../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => mockUseStreamDetail(),
}));

jest.mock('../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: (...args: unknown[]) => mockUseStreamsAppFetch(...args),
}));

jest.mock('../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({
    link: (
      _path: string,
      params: { path: { key: string; tab: string }; query: { origin?: string } }
    ) =>
      `/streams/${params.path.key}/management/${params.path.tab}${
        params.query.origin ? `?origin=${params.query.origin}` : ''
      }`,
    push: jest.fn(),
  }),
}));

const mockUseStreamOrigin = jest.fn();
jest.mock('../../hooks/use_streams_home_link', () => ({
  useStreamOrigin: () => mockUseStreamOrigin(),
}));

jest.mock('../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ rangeFrom: 'now-15m', rangeTo: 'now' }),
}));

jest.mock('./top_failure_reasons', () => ({
  TopFailureReasons: () => null,
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: { application: { navigateToUrl: jest.fn() }, uiSettings: {} },
    dependencies: {
      start: {
        data: { search: { search: jest.fn() } },
        streams: { streamsRepositoryClient: { fetch: jest.fn() } },
      },
    },
  }),
}));

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('DataQualityCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamsAppFetch.mockImplementation(() => ({
      value: 100,
      loading: false,
    }));
  });

  it('returns null for non-ingest (query) stream', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockQueryStreamDefinition(),
    });

    const { container } = renderWithI18n(<DataQualityCard />);

    expect(container.firstChild).toBeNull();
  });

  it('renders Dataset quality title, indicator, and View all link for ingest stream', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
    });

    renderWithI18n(<DataQualityCard />);

    expect(screen.getByText('Dataset quality')).toBeInTheDocument();
    expect(screen.getByText('View all')).toBeInTheDocument();
  });

  it('keeps the origin of the stream page on the View all link', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
    });
    mockUseStreamOrigin.mockReturnValue('v2');

    renderWithI18n(<DataQualityCard />);

    expect(screen.getByText('View all').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('/management/dataQuality?origin=v2')
    );
  });

  it('shows FailedDocsNoPrivilege when read_failure_store is false', () => {
    const def = createMockWiredStreamDefinition({
      privileges: { ...createMockWiredStreamDefinition().privileges, read_failure_store: false },
    });

    mockUseStreamDetail.mockReturnValue({ definition: def });

    renderWithI18n(<DataQualityCard />);

    expect(screen.getByTestId('streamsOverviewFailedDocs')).toBeInTheDocument();
    expect(screen.getByLabelText(/Insufficient privilege/i)).toBeInTheDocument();
  });
});
