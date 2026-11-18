/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ImportsPage } from './imports_page';
import { useFetchImports } from '../../hooks/use_fetch_imports';

let mockCanReadConnectors = true;

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: () => ({ capabilities: { actions: { show: mockCanReadConnectors } } }),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({ useBreadcrumbs: jest.fn() }));
jest.mock('../../hooks/use_fetch_imports', () => ({
  useFetchImports: jest.fn(() => ({ data: [], isLoading: false, error: null })),
}));
jest.mock('../../components/imports/imports_table', () => ({
  ImportsTable: () => <div data-test-subj="importsTable" />,
}));
jest.mock('@kbn/app-header', () => ({ AppHeader: () => null }));

const renderPage = () =>
  render(
    <I18nProvider>
      <ImportsPage />
    </I18nProvider>
  );

describe('ImportsPage', () => {
  beforeEach(() => {
    mockCanReadConnectors = true;
    jest.mocked(useFetchImports).mockClear();
  });

  it('lists the imports when the user can read connectors', () => {
    renderPage();

    expect(screen.getByTestId('importsTable')).toBeInTheDocument();
    expect(useFetchImports).toHaveBeenCalledWith({ enabled: true });
  });

  it('asks for connector access instead of fetching without it', () => {
    mockCanReadConnectors = false;
    renderPage();

    expect(screen.getByTestId('alertingV2ImportsConnectorsPrivilegesPrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('importsTable')).not.toBeInTheDocument();
    expect(useFetchImports).toHaveBeenCalledWith({ enabled: false });
  });
});
