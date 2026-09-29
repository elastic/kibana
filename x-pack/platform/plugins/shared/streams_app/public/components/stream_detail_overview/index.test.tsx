/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamOverview } from '.';
import {
  createMockWiredStreamDefinition,
  createMockQueryStreamDefinition,
} from '../stream_management/data_management/shared/mocks';

const mockUseStreamDetail = vi.fn();
const mockUseStreamsPrivileges = vi.fn();

vi.mock('../../hooks/use_stream_detail', () => {
  const mocked = {
    useStreamDetail: () => mockUseStreamDetail(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_streams_privileges', () => {
  const mocked = {
    useStreamsPrivileges: () => mockUseStreamsPrivileges(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./data_quality_card', () => {
  const mocked = {
    DataQualityCard: () => <div data-test-subj="mockDataQualityCard">Dataset quality</div>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./about_panel', () => {
  const mocked = {
    AboutPanel: () => <div data-test-subj="mockAboutPanel">About this stream</div>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./ingest_rate_chart', () => {
  const mocked = {
    IngestRateChart: () => <div data-test-subj="mockIngestRateChart">Ingest chart</div>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./import_export_panel', () => {
  const mocked = {
    ImportExportPanel: () => <div data-test-subj="mockImportExportPanel">Import & export</div>,
  };
  return { ...mocked, default: mocked };
});

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('StreamOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
      },
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

  it('renders import and export panel when content packs are enabled', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: { contentPacks: { enabled: true } },
    });
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition(),
      refresh: vi.fn(),
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
      refresh: vi.fn(),
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
