/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamOverview } from '.';
import {
  createMockWiredStreamDefinition,
  createMockQueryStreamDefinition,
} from '../stream_management/data_management/shared/mocks';

const mockUseStreamDetail = jest.fn();

jest.mock('../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => mockUseStreamDetail(),
}));

jest.mock('./data_quality_card', () => ({
  DataQualityCard: () => <div data-test-subj="mockDataQualityCard">Dataset quality</div>,
}));

jest.mock('./about_panel', () => ({
  AboutPanel: () => <div data-test-subj="mockAboutPanel">About this stream</div>,
}));

jest.mock('./ingest_rate_chart', () => ({
  IngestRateChart: () => <div data-test-subj="mockIngestRateChart">Ingest chart</div>,
}));

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('StreamOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders about panel in sidebar', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.getByText('About this stream')).toBeInTheDocument();
  });

  it('renders chart and dataset quality card only for ingest stream', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.getByTestId('mockIngestRateChart')).toBeInTheDocument();
    expect(screen.getByText('Dataset quality')).toBeInTheDocument();
  });

  it('renders IngestRateChart for all stream types', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockQueryStreamDefinition(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.getByTestId('mockIngestRateChart')).toBeInTheDocument();
  });

  it('does not render dataset quality card for query stream', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockQueryStreamDefinition(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.queryByText('Dataset quality')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockIngestRateChart')).toBeInTheDocument();
  });
});
