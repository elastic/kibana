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
import { SourceRow } from './source_row';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('SourceRow', () => {
  it('renders the ES|QL query value and its source type', () => {
    renderWithProviders(
      <SourceRow
        source={{ type: 'esql', value: 'FROM logs-* | LIMIT 10' }}
        data-test-subj="testSourceRow"
      />
    );

    expect(screen.getByTestId('testSourceRow')).toHaveTextContent('FROM logs-* | LIMIT 10');
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('ES|QL');
  });

  it('renders the resolved connector name for connector sources', () => {
    renderWithProviders(
      <SourceRow
        source={{ type: 'connector', value: 'connector-gdrive' }}
        connectorName="Drive"
        data-test-subj="testSourceRow"
      />
    );

    expect(screen.getByTestId('testSourceRow')).toHaveTextContent('Drive');
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Connector');
  });

  it('does not render a remove button unless onRemove is provided', () => {
    renderWithProviders(<SourceRow source={{ type: 'esql', value: 'FROM logs-*' }} />);

    expect(screen.queryByTestId('contextRemoveSourceButton')).not.toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', () => {
    const onRemove = jest.fn();
    renderWithProviders(
      <SourceRow source={{ type: 'esql', value: 'FROM logs-*' }} onRemove={onRemove} />
    );

    fireEvent.click(screen.getByTestId('contextRemoveSourceButton'));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
