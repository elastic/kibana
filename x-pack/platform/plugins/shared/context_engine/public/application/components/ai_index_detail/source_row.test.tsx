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
import { SourceRow } from './source_row';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('SourceRow', () => {
  it('renders the ES|QL query value and the source type badge', () => {
    renderWithProviders(<SourceRow source={{ type: 'esql', value: 'FROM logs-* | LIMIT 10' }} />);

    expect(screen.getByTestId('contextAiIndexSourceRow')).toHaveTextContent(
      'FROM logs-* | LIMIT 10'
    );
    expect(screen.getByTestId('contextAiIndexSourceType')).toHaveTextContent('ES|QL');
  });
});
