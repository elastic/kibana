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
const mockUseSetUrlDefaultCategories = jest.fn();
const mockUseUrlDefaultCategories = jest.fn();
const mockUseStartServices = jest.fn();

jest.mock('./hooks', () => ({
  useBrowseIntegrationHook: () => mockUseBrowseIntegrationHook(),
}));

jest.mock('./hooks/url_categories', () => ({
  useSetUrlCategory: () => mockUseSetUrlCategory(),
  useSetUrlDefaultCategories: () => mockUseSetUrlDefaultCategories(),
  useUrlDefaultCategories: () => mockUseUrlDefaultCategories(),
}));

const mockUseAutomaticImportAuthz = jest.fn();
jest.mock('../../../../hooks', () => ({
  useStartServices: () => mockUseStartServices(),
  useBreadcrumbs: jest.fn(),
  useAutomaticImportAuthz: () => mockUseAutomaticImportAuthz(),
}));

const mockUseLocation = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: () => mockUseLocation(),
  useHistory: () => ({ push: jest.fn() }),
}));

jest.mock('./components/responsive_package_grid', () => ({ ResponsivePackageGrid: () => null }));
jest.mock('./components/search_and_filters_bar', () => ({ SearchAndFiltersBar: () => null }));
// Capture the sidebar props so tests can assert which create entry point is offered.
let capturedSidebarProps: {
  CreateIntegrationCardButton?: unknown;
  showCreatedIntegrations?: boolean;
} = {};
jest.mock('./components/side_bar', () => ({
  Sidebar: (props: {
    CreateIntegrationCardButton?: unknown;
    showCreatedIntegrations?: boolean;
  }) => {
    capturedSidebarProps = props;
    return null;
  },
}));
jest.mock('./components/no_data_prompt', () => ({ NoDataPrompt: () => null }));
jest.mock('./components/manage_integrations_table', () => ({
  ManageIntegrationsTable: () => null,
}));
jest.mock('../../components/no_epr_callout', () => ({ NoEprCallout: () => null }));

import { BrowseIntegrationsPage } from '.';

const ALL_CATEGORY = { id: '', title: 'All categories', count: 10 };
const OPENTELEMETRY_CATEGORY = { id: 'opentelemetry', title: 'OpenTelemetry', count: 5 };
const OBSERVABILITY_CATEGORY = { id: 'observability', title: 'Observability', count: 8 };

const makeDefaultHookReturn = (overrides = {}) => ({
  allCategories: [ALL_CATEGORY, OPENTELEMETRY_CATEGORY, OBSERVABILITY_CATEGORY],
  initialSelectedCategory: '',
  selectedCategory: 'opentelemetry',
  mainCategories: [ALL_CATEGORY, OPENTELEMETRY_CATEGORY, OBSERVABILITY_CATEGORY],
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

const observabilityStartServices = {
  cloud: { serverless: { projectType: 'observability' } },
  application: { capabilities: {} },
  automaticImport: undefined,
};

const NO_AUTHZ = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
};

const CreateIntegrationSideCardButton = () => null;
const automaticImportStartServices = {
  ...observabilityStartServices,
  automaticImport: {
    hooks: {
      useGetAllIntegrations: () => ({
        integrations: [],
        isInitialLoading: false,
        isError: false,
        refetch: jest.fn(),
      }),
    },
    components: { CreateIntegrationSideCardButton },
  },
};

describe('BrowseIntegrationsPage', () => {
  const mockSetUrlDefaultCategoriesFn = jest.fn();
  const mockSetUrlCategoryFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    capturedSidebarProps = {};
    mockUseAutomaticImportAuthz.mockReturnValue(NO_AUTHZ);
    mockUseBrowseIntegrationHook.mockReturnValue(makeDefaultHookReturn());
    mockUseSetUrlDefaultCategories.mockReturnValue(mockSetUrlDefaultCategoriesFn);
    mockUseSetUrlCategory.mockReturnValue(mockSetUrlCategoryFn);
    mockUseUrlDefaultCategories.mockReturnValue([]);
    mockUseStartServices.mockReturnValue(observabilityStartServices);
    mockUseLocation.mockReturnValue({ pathname: '/app/integrations/browse', search: '' });
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

  describe('default multi-category redirect', () => {
    it('sets both default categories as URL query params on first load in Observability projects', async () => {
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).toHaveBeenCalledWith(
          ['opentelemetry', 'observability'],
          { replace: true }
        );
      });
    });

    it('only sets categories that exist in the catalog', async () => {
      // opentelemetry exists, observability does not
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({
          allCategories: [ALL_CATEGORY, OPENTELEMETRY_CATEGORY],
          mainCategories: [ALL_CATEGORY, OPENTELEMETRY_CATEGORY],
        })
      );
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).toHaveBeenCalledWith(['opentelemetry'], {
          replace: true,
        });
      });
    });

    it('does not redirect when not an Observability project', async () => {
      mockUseStartServices.mockReturnValue({
        cloud: { serverless: { projectType: 'security' } },
        application: { capabilities: {} },
        automaticImport: undefined,
      });
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).not.toHaveBeenCalled();
      });
    });

    it('does not redirect while loading', async () => {
      mockUseBrowseIntegrationHook.mockReturnValue(makeDefaultHookReturn({ isLoading: true }));
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).not.toHaveBeenCalled();
      });
    });

    it('does not redirect when a path-based category is already in the URL', async () => {
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({ initialSelectedCategory: 'security', selectedCategory: 'security' })
      );
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).not.toHaveBeenCalled();
      });
    });

    it('does not redirect when default categories are already set as URL query params', async () => {
      mockUseUrlDefaultCategories.mockReturnValue(['opentelemetry', 'observability']);
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).not.toHaveBeenCalled();
      });
    });

    it('does not redirect when the Manage Integrations view is active (?view=manage)', async () => {
      mockUseLocation.mockReturnValue({
        pathname: '/app/integrations/browse',
        search: '?view=manage',
      });
      mockUseStartServices.mockReturnValue(automaticImportStartServices);
      mockUseAutomaticImportAuthz.mockReturnValue({ ...NO_AUTHZ, canView: true });
      renderPage();
      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).not.toHaveBeenCalled();
      });
    });

    it('does not redirect again after the user navigates to All categories', async () => {
      const { rerender } = renderPage();
      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).toHaveBeenCalledTimes(1);
      });

      // Simulate user clicking "All categories": URL categories and path category both cleared
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({ initialSelectedCategory: '', selectedCategory: '' })
      );
      mockUseUrlDefaultCategories.mockReturnValue([]);
      rerender(
        <I18nProvider>
          <EuiThemeProvider>
            <BrowseIntegrationsPage prereleaseIntegrationsEnabled={false} />
          </EuiThemeProvider>
        </I18nProvider>
      );

      await waitFor(() => {
        expect(mockSetUrlDefaultCategoriesFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Automatic Import create entry point', () => {
    beforeEach(() => {
      mockUseStartServices.mockReturnValue(automaticImportStartServices);
      mockUseLocation.mockReturnValue({ pathname: '/app/integrations/browse', search: '' });
    });

    it('offers the Create integration card when the user can create', async () => {
      mockUseAutomaticImportAuthz.mockReturnValue({ ...NO_AUTHZ, canView: true, canCreate: true });
      renderPage();

      await waitFor(() => {
        expect(capturedSidebarProps.CreateIntegrationCardButton).toBe(
          CreateIntegrationSideCardButton
        );
      });
    });

    it('does not offer the Create integration card to a read-only user', async () => {
      mockUseAutomaticImportAuthz.mockReturnValue({ ...NO_AUTHZ, canView: true });
      renderPage();

      await waitFor(() => {
        expect(capturedSidebarProps).toHaveProperty('CreateIntegrationCardButton');
      });
      expect(capturedSidebarProps.CreateIntegrationCardButton).toBeUndefined();
    });

    it('still lets a read-only user reach Manage my integrations', async () => {
      mockUseAutomaticImportAuthz.mockReturnValue({ ...NO_AUTHZ, canView: true });
      renderPage();

      await waitFor(() => {
        expect(capturedSidebarProps.showCreatedIntegrations).toBe(true);
      });
    });

    it('hides created integrations entirely without the view capability', async () => {
      mockUseAutomaticImportAuthz.mockReturnValue(NO_AUTHZ);
      renderPage();

      await waitFor(() => {
        expect(capturedSidebarProps).toHaveProperty('showCreatedIntegrations');
      });
      expect(capturedSidebarProps.showCreatedIntegrations).toBe(false);
    });
  });
});
