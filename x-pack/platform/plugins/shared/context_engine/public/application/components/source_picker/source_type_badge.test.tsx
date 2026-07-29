/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SourceTypeBadge } from './source_type_badge';
import { getSourceTypeLabel } from './types';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('SourceTypeBadge', () => {
  it('renders the ES|QL label for type="esql"', () => {
    renderWithProviders(<SourceTypeBadge type="esql" />);

    expect(screen.getByText(getSourceTypeLabel('esql'))).toBeInTheDocument();
  });

  it('renders the Connector label for type="connector"', () => {
    renderWithProviders(<SourceTypeBadge type="connector" />);

    expect(screen.getByText(getSourceTypeLabel('connector'))).toBeInTheDocument();
  });

  it('forwards a custom data-test-subj to the badge', () => {
    renderWithProviders(<SourceTypeBadge type="esql" data-test-subj="customSourceTypeBadge" />);

    expect(screen.getByTestId('customSourceTypeBadge')).toBeInTheDocument();
    expect(screen.getByTestId('customSourceTypeBadge')).toHaveTextContent(
      getSourceTypeLabel('esql')
    );
  });
});
