/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamTitlePanel } from './stream_title';

const mockUpdateStream = jest.fn().mockResolvedValue({});

jest.mock('../../hooks/use_update_streams', () => ({
  useUpdateStreams: () => mockUpdateStream,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StreamTitlePanel', () => {
  const createMockDefinition = (
    overrides: Partial<Streams.WiredStream.GetResponse['stream']> = {}
  ): Streams.WiredStream.GetResponse =>
    ({
      stream: {
        name: 'logs.test',
        description: '',
        title: undefined,
        tags: undefined,
        updated_at: new Date().toISOString(),
        ingest: {
          processing: { steps: [], updated_at: new Date().toISOString() },
          lifecycle: { inherit: {} },
          settings: {},
          wired: {
            fields: {},
            routing: [],
          },
          failure_store: { inherit: {} },
        },
        ...overrides,
      },
      inherited_fields: {},
      effective_lifecycle: { dsl: { data_retention: '7d' }, from: 'logs' },
      effective_settings: {},
      effective_failure_store: {
        lifecycle: { enabled: { data_retention: '7d', is_default_retention: true } },
        from: 'logs',
      },
      privileges: {
        lifecycle: true,
        manage: true,
        monitor: true,
        simulate: true,
        text_structure: true,
        read_failure_store: true,
        manage_failure_store: true,
        view_index_metadata: true,
      },
      dashboards: [],
      rules: [],
      queries: [],
    } as unknown as Streams.WiredStream.GetResponse);

  const mockRefreshDefinition = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the panel title', () => {
    renderWithProviders(
      <StreamTitlePanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByText('Stream title')).toBeInTheDocument();
  });

  it('should display "No title set" when title is not set', () => {
    renderWithProviders(
      <StreamTitlePanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByTestId('streamTitlePanelDisplay')).toHaveTextContent('No title set');
  });

  it('should display the title when set', () => {
    renderWithProviders(
      <StreamTitlePanel
        definition={createMockDefinition({ title: 'Production Logs' })}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByTestId('streamTitlePanelDisplay')).toHaveTextContent('Production Logs');
  });

  it('should show edit button when user has manage privileges', () => {
    renderWithProviders(
      <StreamTitlePanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByTestId('streamTitlePanelEditButton')).toBeInTheDocument();
  });

  it('should not show edit button when user lacks manage privileges', () => {
    const definition = createMockDefinition();
    definition.privileges.manage = false;

    renderWithProviders(
      <StreamTitlePanel definition={definition} refreshDefinition={mockRefreshDefinition} />
    );

    expect(screen.queryByTestId('streamTitlePanelEditButton')).not.toBeInTheDocument();
  });

  it('should show edit form when edit button is clicked', () => {
    renderWithProviders(
      <StreamTitlePanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    fireEvent.click(screen.getByTestId('streamTitlePanelEditButton'));

    expect(screen.getByTestId('streamTitlePanelInput')).toBeInTheDocument();
    expect(screen.getByTestId('streamTitlePanelSaveButton')).toBeInTheDocument();
    expect(screen.getByTestId('streamTitlePanelCancelButton')).toBeInTheDocument();
  });

  it('should cancel edit and revert to display mode', () => {
    renderWithProviders(
      <StreamTitlePanel
        definition={createMockDefinition({ title: 'Original Title' })}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    fireEvent.click(screen.getByTestId('streamTitlePanelEditButton'));
    fireEvent.change(screen.getByTestId('streamTitlePanelInput'), {
      target: { value: 'New Title' },
    });
    fireEvent.click(screen.getByTestId('streamTitlePanelCancelButton'));

    expect(screen.queryByTestId('streamTitlePanelInput')).not.toBeInTheDocument();
    expect(screen.getByTestId('streamTitlePanelDisplay')).toHaveTextContent('Original Title');
  });

  it('should save title when save button is clicked', async () => {
    renderWithProviders(
      <StreamTitlePanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    fireEvent.click(screen.getByTestId('streamTitlePanelEditButton'));
    fireEvent.change(screen.getByTestId('streamTitlePanelInput'), {
      target: { value: 'New Title' },
    });
    fireEvent.click(screen.getByTestId('streamTitlePanelSaveButton'));

    await waitFor(() => {
      expect(mockUpdateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: expect.objectContaining({
            title: 'New Title',
          }),
        })
      );
    });

    expect(mockRefreshDefinition).toHaveBeenCalled();
  });

  it('should set title to undefined when saving empty string', async () => {
    renderWithProviders(
      <StreamTitlePanel
        definition={createMockDefinition({ title: 'Old Title' })}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    fireEvent.click(screen.getByTestId('streamTitlePanelEditButton'));
    fireEvent.change(screen.getByTestId('streamTitlePanelInput'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByTestId('streamTitlePanelSaveButton'));

    await waitFor(() => {
      expect(mockUpdateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: expect.objectContaining({
            title: undefined,
          }),
        })
      );
    });
  });
});
