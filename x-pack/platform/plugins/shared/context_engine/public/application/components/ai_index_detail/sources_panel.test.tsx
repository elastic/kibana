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
import { SourcesPanel } from './sources_panel';

jest.mock('../../hooks/use_data_connectors', () => ({
  useDataConnectors: () => ({
    connectors: [{ id: 'connector-gdrive', name: 'Google Drive' }],
    connectorNameById: new Map([['connector-gdrive', 'Google Drive']]),
    isLoading: false,
  }),
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
  it('shows the loading skeleton while loading and no rows', () => {
    renderWithProviders(
      <SourcesPanel isLoading sources={[]} canEdit={false} onEditSources={jest.fn()} />
    );

    expect(screen.getByTestId('contextAiIndexSourcesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
  });

  it('shows the empty message when not loading and there are no sources', () => {
    renderWithProviders(
      <SourcesPanel isLoading={false} sources={[]} canEdit onEditSources={jest.fn()} />
    );

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
  });

  it('renders one row per source', () => {
    renderWithProviders(
      <SourcesPanel isLoading={false} sources={sources} canEdit onEditSources={jest.fn()} />
    );

    expect(screen.getAllByTestId('contextAiIndexSourceRow')).toHaveLength(sources.length);
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
  });

  it('resolves the connector name for connector sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        sources={[{ type: 'connector', value: 'connector-gdrive' }]}
        canEdit
        onEditSources={jest.fn()}
      />
    );

    expect(screen.getByTestId('contextAiIndexSourceRow')).toHaveTextContent('Google Drive');
  });

  it('disables the edit button when editing is not allowed', () => {
    renderWithProviders(
      <SourcesPanel isLoading={false} sources={sources} canEdit={false} onEditSources={jest.fn()} />
    );

    expect(screen.getByTestId('contextEditSourcesButton')).toBeDisabled();
  });

  it('calls onEditSources when the edit button is clicked', () => {
    const onEditSources = jest.fn();
    renderWithProviders(
      <SourcesPanel isLoading={false} sources={sources} canEdit onEditSources={onEditSources} />
    );

    fireEvent.click(screen.getByTestId('contextEditSourcesButton'));

    expect(onEditSources).toHaveBeenCalledTimes(1);
  });
});
