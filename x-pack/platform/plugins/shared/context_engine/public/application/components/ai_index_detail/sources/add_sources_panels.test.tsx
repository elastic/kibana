/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { SelectedSource } from './types';
import { AddConnectorsPanel, AddElasticsearchDataPanel } from './add_sources_panels';

jest.mock('./elasticsearch_sources_panel', () => ({
  ElasticsearchSourcesPanel: ({
    pendingIndexNames,
    onToggleIndex,
    esqlQuery,
    onEsqlQueryChange,
    mode = 'index',
  }: {
    pendingIndexNames: string[];
    onToggleIndex: (indexName: string, checked: boolean) => void;
    esqlQuery: string;
    onEsqlQueryChange: (query: string) => void;
    mode?: 'index' | 'esql';
  }) => (
    <div data-test-subj="mockElasticsearchSourcesPanel">
      {mode === 'index' ? (
        <>
          {(['logs-*', 'metrics-*'] as const).map((indexName) => {
            const checked = pendingIndexNames.includes(indexName);
            return (
              <button
                key={indexName}
                type="button"
                data-test-subj={`mockToggleIndex-${indexName}`}
                aria-pressed={checked}
                onClick={() => onToggleIndex(indexName, !checked)}
              >
                {indexName}
              </button>
            );
          })}
        </>
      ) : (
        <textarea
          data-test-subj="mockEsqlInput"
          value={esqlQuery}
          onChange={(event) => onEsqlQueryChange(event.target.value)}
        />
      )}
    </div>
  ),
}));

jest.mock('./connector_select', () => ({
  ConnectorSelect: ({
    onToggle,
  }: {
    onToggle: (params: { id: string; name: string; checked: boolean }) => void;
  }) => (
    <div data-test-subj="mockConnectorsTab">
      <button
        type="button"
        data-test-subj="mockToggleConnector-github"
        onClick={() => onToggle({ id: 'connector-github', name: 'GitHub', checked: true })}
      >
        GitHub
      </button>
      <button
        type="button"
        data-test-subj="mockToggleConnector-gdrive"
        onClick={() => onToggle({ id: 'connector-gdrive', name: 'Google Drive', checked: true })}
      >
        Google Drive
      </button>
      <button
        type="button"
        data-test-subj="mockUntoggleConnector-github"
        onClick={() => onToggle({ id: 'connector-github', name: 'GitHub', checked: false })}
      >
        Unselect GitHub
      </button>
    </div>
  ),
}));

const mockUseCreateConnectorFlyout = jest.fn(() => ({
  canCreateConnector: false,
  canReadConnectors: true,
  openCreateFlyout: jest.fn(),
  createConnectorFlyout: null,
}));

jest.mock('../../../hooks/use_create_connector_flyout', () => ({
  useCreateConnectorFlyout: () => mockUseCreateConnectorFlyout(),
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const esqlSelectedSource = (value: string): SelectedSource => ({
  type: 'esql',
  value,
});

const connectorSource = (id: string): SelectedSource => ({
  type: 'connector',
  value: id,
});

describe('AddElasticsearchDataPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds multiple index selections as FROM queries on confirm', async () => {
    const onAdd = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();

    renderWithProviders(
      <AddElasticsearchDataPanel
        savedSources={[]}
        onAdd={onAdd}
        onClose={onClose}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByTestId('mockToggleIndex-logs-*'));
    fireEvent.click(screen.getByTestId('mockToggleIndex-metrics-*'));
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toHaveTextContent('Add 2 sources');

    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith([
        esqlSelectedSource('FROM logs-*'),
        esqlSelectedSource('FROM metrics-*'),
      ]);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps confirm disabled for a duplicate ES|QL query already saved', () => {
    renderWithProviders(
      <AddElasticsearchDataPanel
        savedSources={[esqlSelectedSource('FROM metrics-*')]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByTestId('contextToggleEsqlModeButton'));
    fireEvent.change(screen.getByTestId('mockEsqlInput'), {
      target: { value: 'FROM metrics-*' },
    });

    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeDisabled();
  });

  it('keeps confirm disabled for whitespace-only ES|QL input', () => {
    renderWithProviders(
      <AddElasticsearchDataPanel
        savedSources={[]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByTestId('contextToggleEsqlModeButton'));
    fireEvent.change(screen.getByTestId('mockEsqlInput'), { target: { value: '   \n  ' } });

    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeDisabled();
  });

  it('preserves pending index selections when toggling between index and ES|QL modes', () => {
    renderWithProviders(
      <AddElasticsearchDataPanel
        savedSources={[]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByTestId('mockToggleIndex-logs-*'));
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeEnabled();

    fireEvent.click(screen.getByTestId('contextToggleEsqlModeButton'));
    expect(screen.getByTestId('mockEsqlInput')).toBeInTheDocument();
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeDisabled();

    fireEvent.click(screen.getByTestId('contextToggleEsqlModeButton'));
    expect(screen.getByTestId('mockToggleIndex-logs-*')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeEnabled();
  });

  it('stays open and does not call onClose when onAdd returns false', async () => {
    const onAdd = jest.fn().mockResolvedValue(false);
    const onClose = jest.fn();

    renderWithProviders(
      <AddElasticsearchDataPanel
        savedSources={[]}
        onAdd={onAdd}
        onClose={onClose}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByTestId('mockToggleIndex-logs-*'));
    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('contextAddElasticsearchDataPanel')).toBeInTheDocument();
  });
});

describe('AddConnectorsPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds multiple pending connectors on confirm', async () => {
    const onAdd = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();

    renderWithProviders(
      <AddConnectorsPanel savedSources={[]} onAdd={onAdd} onClose={onClose} isSaving={false} />
    );

    fireEvent.click(screen.getByTestId('mockToggleConnector-github'));
    fireEvent.click(screen.getByTestId('mockToggleConnector-gdrive'));
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toHaveTextContent('Add 2 sources');

    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith([
        connectorSource('connector-github'),
        connectorSource('connector-gdrive'),
      ]);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lowers pending count when a connector is toggled off', () => {
    renderWithProviders(
      <AddConnectorsPanel
        savedSources={[]}
        onAdd={jest.fn()}
        onClose={jest.fn()}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByTestId('mockToggleConnector-github'));
    fireEvent.click(screen.getByTestId('mockToggleConnector-gdrive'));
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toHaveTextContent('Add 2 sources');

    fireEvent.click(screen.getByTestId('mockUntoggleConnector-github'));
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toHaveTextContent('Add source');
  });
});
