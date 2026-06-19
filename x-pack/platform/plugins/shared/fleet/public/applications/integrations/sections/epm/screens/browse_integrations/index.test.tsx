/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

const mockUseBrowseIntegrationHook = jest.fn();
const mockUseSetUrlCategory = jest.fn();
const mockUseStartServices = jest.fn();

jest.mock('./hooks', () => ({
  useBrowseIntegrationHook: () => mockUseBrowseIntegrationHook(),
}));

jest.mock('./hooks/url_categories', () => ({
  useSetUrlCategory: () => mockUseSetUrlCategory(),
}));

jest.mock('../../../../hooks', () => ({
  useStartServices: () => mockUseStartServices(),
  useBreadcrumbs: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/app/integrations', search: '' }),
  useHistory: () => ({ push: jest.fn() }),
}));

jest.mock('./components/responsive_package_grid', () => ({ ResponsivePackageGrid: () => null }));
jest.mock('./components/search_and_filters_bar', () => ({ SearchAndFiltersBar: () => null }));
jest.mock('./components/side_bar', () => ({ Sidebar: () => null }));
jest.mock('./components/no_data_prompt', () => ({ NoDataPrompt: () => null }));
jest.mock('./components/manage_integrations_table', () => ({
  ManageIntegrationsTable: () => null,
}));
jest.mock('../../components/no_epr_callout', () => ({ NoEprCallout: () => null }));

import { BrowseIntegrationsPage } from '.';

const ALL_CATEGORY = { id: '', title: 'All categories', count: 10 };
const OPENTELEMETRY_CATEGORY = { id: 'opentelemetry', title: 'OpenTelemetry', count: 5 };

const makeDefaultHookReturn = (overrides = {}) => ({
  allCategories: [ALL_CATEGORY, OPENTELEMETRY_CATEGORY],
  initialSelectedCategory: '',
  selectedCategory: 'opentelemetry',
  mainCategories: [ALL_CATEGORY, OPENTELEMETRY_CATEGORY],
  isLoading: false,
  isLoadingCategories: false,
  isLoadingAllPackages: false,
  isLoadingAppendCustomIntegrations: false,
  eprPackageLoadingError: undefined,
  eprCategoryLoadingError: undefined,
  filteredCards: [],
  onCategoryChange: jest.fn(),
  availableSubCategories: [],
  ...overrides,
});

describe('BrowseIntegrationsPage', () => {
  const mockSetUrlCategory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBrowseIntegrationHook.mockReturnValue(makeDefaultHookReturn());
    mockUseSetUrlCategory.mockReturnValue(mockSetUrlCategory);
    mockUseStartServices.mockReturnValue({
      cloud: { serverless: { projectType: 'observability' } },
      application: { capabilities: {} },
      automaticImport: undefined,
    });
  });

  function renderPage() {
    return render(
      <I18nProvider>
        <EuiThemeProvider>
          <BrowseIntegrationsPage prereleaseIntegrationsEnabled={false} />
        </EuiThemeProvider>
      </I18nProvider>
    );
  }

  describe('default category redirect for Observability projects', () => {
    it('redirects to opentelemetry when no URL category is set', async () => {
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlCategory).toHaveBeenCalledWith(
          { category: 'opentelemetry' },
          { replace: true }
        );
      });
    });

    it('does not redirect when not on an Observability project', async () => {
      mockUseStartServices.mockReturnValue({
        cloud: { serverless: { projectType: 'security' } },
        application: { capabilities: {} },
        automaticImport: undefined,
      });
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlCategory).not.toHaveBeenCalledWith(
          { category: 'opentelemetry' },
          expect.anything()
        );
      });
    });

    it('does not redirect while loading', async () => {
      mockUseBrowseIntegrationHook.mockReturnValue(makeDefaultHookReturn({ isLoading: true }));
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlCategory).not.toHaveBeenCalled();
      });
    });

    it('does not redirect when a category is already in the URL', async () => {
      const SECURITY_CATEGORY = { id: 'security', title: 'Security', count: 3 };
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({
          initialSelectedCategory: 'security',
          selectedCategory: 'security',
          allCategories: [ALL_CATEGORY, OPENTELEMETRY_CATEGORY, SECURITY_CATEGORY],
          mainCategories: [ALL_CATEGORY, OPENTELEMETRY_CATEGORY, SECURITY_CATEGORY],
        })
      );
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlCategory).not.toHaveBeenCalledWith(
          { category: 'opentelemetry' },
          expect.anything()
        );
      });
    });

    it('does not redirect when the opentelemetry category does not exist', async () => {
      const SECURITY_CATEGORY = { id: 'security', title: 'Security', count: 3 };
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({
          allCategories: [ALL_CATEGORY, SECURITY_CATEGORY],
          mainCategories: [ALL_CATEGORY, SECURITY_CATEGORY],
        })
      );
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlCategory).not.toHaveBeenCalledWith(
          { category: 'opentelemetry' },
          expect.anything()
        );
      });
    });
  });
});
