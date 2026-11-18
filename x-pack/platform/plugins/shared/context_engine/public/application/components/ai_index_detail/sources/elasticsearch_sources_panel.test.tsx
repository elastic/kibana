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
import type { SelectedSource } from './types';
import { ElasticsearchSourcesPanel } from './elasticsearch_sources_panel';

interface MockIndexMultiSelectProps {
  disabled?: boolean;
  pendingIndexNames: string[];
  onToggle: (indexName: string, checked: boolean) => void;
  isIndexSaved: (indexName: string) => boolean;
}

const mockIndexMultiSelect = jest.fn(({ disabled, onToggle }: MockIndexMultiSelectProps) => (
  <div data-test-subj="mockIndexMultiSelect" data-disabled={String(Boolean(disabled))}>
    <button type="button" data-test-subj="mockIndexToggle" onClick={() => onToggle('logs-*', true)}>
      toggle
    </button>
  </div>
));

jest.mock('./index_multi_select', () => ({
  IndexMultiSelect: (props: MockIndexMultiSelectProps) => mockIndexMultiSelect(props),
}));

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
  }: {
    query: { esql: string };
    onTextLangQueryChange: (query: { esql: string }) => void;
  }) => (
    <textarea
      data-test-subj="mockEsqlEditor"
      value={query.esql}
      onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
    />
  ),
}));

const renderPanel = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const savedSources: SelectedSource[] = [{ type: 'esql', value: 'FROM logs-*' }];

describe('ElasticsearchSourcesPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards props to IndexMultiSelect in index mode', () => {
    const onToggleIndex = jest.fn();
    renderPanel(
      <ElasticsearchSourcesPanel
        savedSources={savedSources}
        pendingIndexNames={['metrics-*']}
        onToggleIndex={onToggleIndex}
        esqlQuery=""
        onEsqlQueryChange={jest.fn()}
        disabled
        mode="index"
      />
    );

    expect(screen.getByTestId('mockIndexMultiSelect')).toHaveAttribute('data-disabled', 'true');
    expect(mockIndexMultiSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingIndexNames: ['metrics-*'],
        disabled: true,
      })
    );

    fireEvent.click(screen.getByTestId('mockIndexToggle'));
    expect(onToggleIndex).toHaveBeenCalledWith('logs-*', true);
  });

  it('renders the ES|QL editor and calls onEsqlQueryChange in esql mode', () => {
    const onEsqlQueryChange = jest.fn();
    renderPanel(
      <ElasticsearchSourcesPanel
        savedSources={[]}
        pendingIndexNames={[]}
        onToggleIndex={jest.fn()}
        esqlQuery="FROM a"
        onEsqlQueryChange={onEsqlQueryChange}
        mode="esql"
      />
    );

    expect(screen.getByTestId('contextAdvancedEsqlEditor')).toBeInTheDocument();
    expect(screen.queryByTestId('mockIndexMultiSelect')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockEsqlEditor')).toHaveValue('FROM a');

    fireEvent.change(screen.getByTestId('mockEsqlEditor'), {
      target: { value: 'FROM logs-* | LIMIT 5' },
    });
    expect(onEsqlQueryChange).toHaveBeenCalledWith('FROM logs-* | LIMIT 5');
  });
});
