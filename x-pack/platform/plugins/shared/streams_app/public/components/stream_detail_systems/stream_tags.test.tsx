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
import { StreamTagsPanel } from './stream_tags';

const mockUpdateStream = jest.fn().mockResolvedValue({});

jest.mock('../../hooks/use_update_streams', () => ({
  useUpdateStreams: () => mockUpdateStream,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StreamTagsPanel', () => {
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
      <StreamTagsPanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByText('Stream tags')).toBeInTheDocument();
  });

  it('should display "No tags set" when tags are not set', () => {
    renderWithProviders(
      <StreamTagsPanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByTestId('streamTagsPanelEmpty')).toHaveTextContent('No tags set');
  });

  it('should display tags as badges when set', () => {
    renderWithProviders(
      <StreamTagsPanel
        definition={createMockDefinition({ tags: ['nginx', 'production', 'web'] })}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByTestId('streamTagsPanelBadge-nginx')).toHaveTextContent('nginx');
    expect(screen.getByTestId('streamTagsPanelBadge-production')).toHaveTextContent('production');
    expect(screen.getByTestId('streamTagsPanelBadge-web')).toHaveTextContent('web');
  });

  it('should show edit button when user has manage privileges', () => {
    renderWithProviders(
      <StreamTagsPanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByTestId('streamTagsPanelEditButton')).toBeInTheDocument();
  });

  it('should not show edit button when user lacks manage privileges', () => {
    const definition = createMockDefinition();
    definition.privileges.manage = false;

    renderWithProviders(
      <StreamTagsPanel definition={definition} refreshDefinition={mockRefreshDefinition} />
    );

    expect(screen.queryByTestId('streamTagsPanelEditButton')).not.toBeInTheDocument();
  });

  it('should show edit form when edit button is clicked', () => {
    renderWithProviders(
      <StreamTagsPanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    fireEvent.click(screen.getByTestId('streamTagsPanelEditButton'));

    expect(screen.getByTestId('streamTagsPanelComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('streamTagsPanelSaveButton')).toBeInTheDocument();
    expect(screen.getByTestId('streamTagsPanelCancelButton')).toBeInTheDocument();
  });

  it('should cancel edit and revert to display mode', () => {
    renderWithProviders(
      <StreamTagsPanel
        definition={createMockDefinition({ tags: ['nginx'] })}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    fireEvent.click(screen.getByTestId('streamTagsPanelEditButton'));
    fireEvent.click(screen.getByTestId('streamTagsPanelCancelButton'));

    expect(screen.queryByTestId('streamTagsPanelComboBox')).not.toBeInTheDocument();
    expect(screen.getByTestId('streamTagsPanelBadge-nginx')).toBeInTheDocument();
  });

  it('should save tags when save button is clicked', async () => {
    renderWithProviders(
      <StreamTagsPanel
        definition={createMockDefinition({ tags: ['nginx'] })}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    fireEvent.click(screen.getByTestId('streamTagsPanelEditButton'));
    fireEvent.click(screen.getByTestId('streamTagsPanelSaveButton'));

    await waitFor(() => {
      expect(mockUpdateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: expect.objectContaining({
            tags: ['nginx'],
          }),
        })
      );
    });

    expect(mockRefreshDefinition).toHaveBeenCalled();
  });

  it('should set tags to undefined when saving empty array', async () => {
    renderWithProviders(
      <StreamTagsPanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    fireEvent.click(screen.getByTestId('streamTagsPanelEditButton'));
    fireEvent.click(screen.getByTestId('streamTagsPanelSaveButton'));

    await waitFor(() => {
      expect(mockUpdateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: expect.objectContaining({
            tags: undefined,
          }),
        })
      );
    });
  });

  it('should display help text', () => {
    renderWithProviders(
      <StreamTagsPanel
        definition={createMockDefinition()}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(
      screen.getByText(
        'Tags help you organize and filter streams. Add descriptive tags for easy categorization.'
      )
    ).toBeInTheDocument();
  });
});
