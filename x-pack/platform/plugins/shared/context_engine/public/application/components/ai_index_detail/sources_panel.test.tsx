/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { AiIndexSource } from '../../../../common/http_api/ai_indices';
import type {
  UseDataConnectorsOptions,
  UseDataConnectorsResult,
} from '../../hooks/use_data_connectors';
import { SourcesPanel } from './sources_panel';

const mockUseDataConnectors = jest.fn(
  (_options?: UseDataConnectorsOptions): UseDataConnectorsResult => ({
    connectors: [{ id: 'connector-gdrive', name: 'Google Drive' }],
    connectorNameById: new Map([['connector-gdrive', 'Google Drive']]),
    isLoading: false,
    isError: false,
    error: undefined,
  })
);

jest.mock('../../hooks/use_data_connectors', () => ({
  useDataConnectors: (options?: UseDataConnectorsOptions) => mockUseDataConnectors(options),
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const sources: AiIndexSource[] = [
  { type: 'esql', value: 'FROM a' },
  { type: 'esql', value: 'FROM b' },
  { type: 'esql', value: 'FROM c' },
];

describe('SourcesPanel', () => {
  beforeEach(() => {
    mockUseDataConnectors.mockClear();
  });

  it('shows the loading skeleton while loading and no rows', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading
        sources={[]}
        canEdit={false}
        onEditSources={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getByTestId('contextAiIndexSourcesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
  });

  it('shows the empty message when not loading and there are no sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={[]}
        canEdit
        onEditSources={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
    expect(
      screen.getByText('No sources yet. Add a source to start building context for this AI index.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
  });

  it('shows read-only empty copy for managed AI indexes with no sources', () => {
    renderWithProviders(
      <SourcesPanel isLoading={false} sources={[]} canEdit onEditSources={jest.fn()} isManaged />
    );

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
    expect(screen.getByText('This AI index has no sources.')).toBeInTheDocument();
  });

  it('renders one row per source', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={sources}
        canEdit
        onEditSources={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getAllByTestId('contextAiIndexSourceRow')).toHaveLength(sources.length);
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
  });

  it('does not fetch connectors when there are no connector sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={sources}
        canEdit
        onEditSources={jest.fn()}
        isManaged={false}
      />
    );

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: false });
  });

  it('fetches connectors when at least one source is a connector', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={[{ type: 'connector', value: 'connector-gdrive' }]}
        canEdit
        onEditSources={jest.fn()}
        isManaged={false}
      />
    );

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: true });
  });

  it('resolves the connector name for connector sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={[{ type: 'connector', value: 'connector-gdrive' }]}
        canEdit
        onEditSources={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getByTestId('contextAiIndexSourceRow')).toHaveTextContent('Google Drive');
  });

  it('disables the edit button when editing is not allowed', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={sources}
        canEdit={false}
        onEditSources={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getByTestId('contextEditSourcesButton')).toBeDisabled();
  });

  it('hides the edit button for managed AI indexes', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={sources}
        canEdit
        onEditSources={jest.fn()}
        isManaged
      />
    );

    expect(screen.queryByTestId('contextEditSourcesButton')).not.toBeInTheDocument();
  });

  it('calls onEditSources when the edit button is clicked', () => {
    const onEditSources = jest.fn();
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={sources}
        canEdit
        onEditSources={onEditSources}
        isManaged={false}
      />
    );

    fireEvent.click(screen.getByTestId('contextEditSourcesButton'));

    expect(onEditSources).toHaveBeenCalledTimes(1);
  });
});
