/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { ListKiHeader } from './list_ki_header';

const DISCOVER_URL = 'http://localhost/app/discover';

const renderHeader = ({ isLoading = false, hasError = false } = {}) =>
  render(
    <I18nProvider>
      <ListKiHeader
        total={12}
        isLoading={isLoading}
        hasError={hasError}
        discoverHref={DISCOVER_URL}
      />
    </I18nProvider>
  );

describe('ListKiHeader', () => {
  it('shows the count after the data has loaded', () => {
    renderHeader();

    expect(screen.getByTestId('contextListKiHeaderCount')).toHaveTextContent(
      '12 Knowledge documents'
    );
    expect(screen.queryByTestId('contextListKiHeaderCountLoading')).not.toBeInTheDocument();
  });

  it('shows a skeleton instead of the count on the first load', () => {
    renderHeader({ isLoading: true });

    expect(screen.getByTestId('contextListKiHeaderCountLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiHeaderCount')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextListKiHeaderDiscoverLink')).toBeInTheDocument();
  });

  it('hides the count when loading fails', () => {
    renderHeader({ hasError: true });

    expect(screen.queryByTestId('contextListKiHeaderCount')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiHeaderCountLoading')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextListKiHeaderDiscoverLink')).toBeInTheDocument();
  });
});
