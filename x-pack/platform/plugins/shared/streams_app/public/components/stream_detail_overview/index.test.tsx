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
const mockUseStreamsPrivileges = jest.fn();
const mockUseSignificantEventsAvailability = jest.fn();

jest.mock('../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => mockUseStreamDetail(),
}));

jest.mock('../../hooks/use_streams_privileges', () => ({
  useStreamsPrivileges: () => mockUseStreamsPrivileges(),
}));

jest.mock('../../hooks/significant_events/use_significant_events_availability', () => ({
  useSignificantEventsAvailability: () => mockUseSignificantEventsAvailability(),
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

jest.mock('./import_export_panel', () => ({
  ImportExportPanel: () => <div data-test-subj="mockImportExportPanel">Import & export</div>,
}));

jest.mock('./knowledge_indicators_panel', () => ({
  KnowledgeIndicatorsPanel: () => (
    <div data-test-subj="mockKnowledgeIndicatorsPanel">Knowledge indicators</div>
  ),
}));

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('StreamOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
        significantEvents: { available: false },
      },
      isLoading: false,
    });
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: false },
      isLoading: false,
    });
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

  it('renders knowledge indicators panel when significant events is available', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
        significantEvents: { available: true },
      },
      isLoading: false,
    });
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: true },
      isLoading: false,
    });
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
      refresh: jest.fn(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.getByTestId('mockKnowledgeIndicatorsPanel')).toBeInTheDocument();
  });

  it('does not render knowledge indicators panel when significant events is unavailable on the client', () => {
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: true },
      isLoading: false,
    });
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
      refresh: jest.fn(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.queryByTestId('mockKnowledgeIndicatorsPanel')).not.toBeInTheDocument();
  });

  it('does not render knowledge indicators panel while privileges are loading', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
        significantEvents: { available: true },
      },
      isLoading: true,
    });
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: true },
      isLoading: false,
    });
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
      refresh: jest.fn(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.queryByTestId('mockKnowledgeIndicatorsPanel')).not.toBeInTheDocument();
  });

  it('does not render knowledge indicators panel while availability is loading', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
        significantEvents: { available: true },
      },
      isLoading: false,
    });
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: undefined,
      isLoading: true,
    });
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
      refresh: jest.fn(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.queryByTestId('mockKnowledgeIndicatorsPanel')).not.toBeInTheDocument();
  });

  it('does not render knowledge indicators panel when significant events is unavailable', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
        significantEvents: { available: true },
      },
      isLoading: false,
    });
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: false, reason: 'feature_flag' },
      isLoading: false,
    });
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
      refresh: jest.fn(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.queryByTestId('mockKnowledgeIndicatorsPanel')).not.toBeInTheDocument();
  });

  it('renders import and export panel when content packs are enabled', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: { contentPacks: { enabled: true } },
    });
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
      refresh: jest.fn(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.getByText('Import & export')).toBeInTheDocument();
  });

  it('does not render import and export panel for query stream', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: { contentPacks: { enabled: true } },
    });
    mockUseStreamDetail.mockReturnValue({
      definition: createMockQueryStreamDefinition(),
      refresh: jest.fn(),
    });

    renderWithI18n(<StreamOverview />);

    expect(screen.queryByText('Import & export')).not.toBeInTheDocument();
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

  it('does not render dataset quality card for draft stream', () => {
    const baseDefinition = createMockWiredStreamDefinition();
    const definition = createMockWiredStreamDefinition({
      stream: {
        ...baseDefinition.stream,
        ingest: {
          ...baseDefinition.stream.ingest,
          wired: {
            ...baseDefinition.stream.ingest.wired,
            draft: true,
          },
        },
      },
    });

    mockUseStreamDetail.mockReturnValue({ definition });

    renderWithI18n(<StreamOverview />);

    expect(screen.queryByText('Dataset quality')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockIngestRateChart')).toBeInTheDocument();
  });
});
