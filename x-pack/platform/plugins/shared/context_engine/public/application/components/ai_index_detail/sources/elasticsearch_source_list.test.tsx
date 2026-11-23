/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { SelectedSource } from './types';
import { ElasticsearchSourceList } from './elasticsearch_source_list';

const renderList = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const esqlSources: SelectedSource[] = [
  { type: 'esql', value: 'FROM a' },
  { type: 'esql', value: 'FROM b' },
];

describe('ElasticsearchSourceList', () => {
  it('renders emptyMessage when there are no sources', () => {
    renderList(
      <ElasticsearchSourceList sources={[]} emptyMessage="No Elasticsearch data sources." />
    );

    expect(screen.getByText('No Elasticsearch data sources.')).toBeInTheDocument();
  });

  it('renders the ES|QL query in a code element', () => {
    renderList(
      <ElasticsearchSourceList
        sources={esqlSources}
        emptyMessage="No Elasticsearch data sources."
      />
    );

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    const code = row.querySelector('code');
    expect(code).toHaveTextContent('FROM a');
    expect(within(row).getByTestId('contextSourceTypeBadge')).toHaveTextContent('ES|QL');
  });

  it('calls onRemove when the remove button is clicked', () => {
    const onRemove = jest.fn();
    renderList(
      <ElasticsearchSourceList
        sources={esqlSources}
        onRemove={onRemove}
        emptyMessage="No Elasticsearch data sources."
      />
    );

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    expect(onRemove).toHaveBeenCalledWith(esqlSources[0]);
  });

  it('disables the remove button when disabled is true', () => {
    renderList(
      <ElasticsearchSourceList
        sources={esqlSources}
        onRemove={jest.fn()}
        disabled
        emptyMessage="No Elasticsearch data sources."
      />
    );

    expect(screen.getAllByTestId('contextRemoveSourceButton')[0]).toBeDisabled();
  });

  it('omits remove buttons when onRemove is undefined', () => {
    renderList(
      <ElasticsearchSourceList
        sources={esqlSources}
        emptyMessage="No Elasticsearch data sources."
      />
    );

    expect(screen.queryByTestId('contextRemoveSourceButton')).not.toBeInTheDocument();
  });
});
