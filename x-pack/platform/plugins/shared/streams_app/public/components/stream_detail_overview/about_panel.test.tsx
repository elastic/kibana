/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AboutPanel } from './about_panel';
import {
  createMockWiredStreamDefinition,
  createMockQueryStreamDefinition,
} from '../stream_management/data_management/shared/mocks';

const mockUseStreamDetail = jest.fn();
const mockUseStreamsAppRouter = jest.fn();
const mockUseStreamsPrivileges = jest.fn();

jest.mock('../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => mockUseStreamDetail(),
}));

jest.mock('../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => mockUseStreamsAppRouter(),
}));

jest.mock('../../hooks/use_streams_privileges', () => ({
  useStreamsPrivileges: () => mockUseStreamsPrivileges(),
}));

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('AboutPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamsAppRouter.mockReturnValue({
      link: (_path: string, params: { path: { key: string; tab: string } }) =>
        `/streams/${params.path.key}/management/${params.path.tab}`,
    });
    mockUseStreamsPrivileges.mockReturnValue({
      features: { significantEvents: { enabled: false, available: false } },
    });
  });

  it('returns null when no query stream, no description, and no edit button', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition({
        stream: { ...createMockWiredStreamDefinition().stream, description: '' },
      }),
    });

    const { container } = renderWithI18n(<AboutPanel />);

    expect(container.firstChild).toBeNull();
  });

  it('renders About this stream title for ingest stream with description', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition({
        stream: {
          ...createMockWiredStreamDefinition().stream,
          description: 'Test description',
        },
      }),
    });
    mockUseStreamsPrivileges.mockReturnValue({
      features: { significantEvents: { enabled: true, available: true } },
    });

    renderWithI18n(<AboutPanel />);

    expect(screen.getByText('About this stream')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders ESQL code block for query stream', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockQueryStreamDefinition({
        stream: {
          ...createMockQueryStreamDefinition().stream,
          query: { view: '$.logs.ecs.query', esql: 'FROM $.logs.ecs | LIMIT 100' },
        },
      }),
    });

    renderWithI18n(<AboutPanel />);

    expect(screen.getByText('About this stream')).toBeInTheDocument();
    expect(screen.getByText('FROM $.logs.ecs | LIMIT 100')).toBeInTheDocument();
  });

  it('renders edit button when canEditQuery (query stream)', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockQueryStreamDefinition(),
    });

    renderWithI18n(<AboutPanel />);

    expect(screen.getByLabelText('Edit query')).toBeInTheDocument();
  });

  it('renders Enter description link when description empty and canEditDescription', () => {
    mockUseStreamDetail.mockReturnValue({
      definition: createMockWiredStreamDefinition({
        stream: { ...createMockWiredStreamDefinition().stream, description: '' },
      }),
    });
    mockUseStreamsPrivileges.mockReturnValue({
      features: { significantEvents: { enabled: true, available: true } },
    });

    renderWithI18n(<AboutPanel />);

    expect(screen.getByText('Enter description')).toBeInTheDocument();
    expect(screen.getByText(/to help identify this stream/)).toBeInTheDocument();
  });
});
