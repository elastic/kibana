/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
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
const mockUseAuthz = jest.fn();
jest.mock('../../../../hooks', () => ({
  useStartServices: () => mockUseStartServices(),
  useBreadcrumbs: jest.fn(),
  useAuthz: () => mockUseAuthz(),
  useAutomaticImportAuthz: () => mockUseAutomaticImportAuthz(),
}));

const mockUseLocation = jest.fn();
const mockHistoryReplace = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: () => mockUseLocation(),
  useHistory: () => ({ push: jest.fn(), replace: mockHistoryReplace }),
}));

// Capture the items prop so tests can invoke injected onCardClick handlers directly.
let capturedFilteredCards: Array<{ isCollectionCard?: boolean; onCardClick?: () => void }> = [];
jest.mock('./components/responsive_package_grid', () => ({
  ResponsivePackageGrid: ({ items }: { items: any[] }) => {
    capturedFilteredCards = items;
    return null;
  },
}));
jest.mock('./components/search_and_filters_bar', () => ({ SearchAndFiltersBar: () => null }));
// Capture the sidebar props so tests can assert which create entry point is offered.
interface CapturedSidebarProps {
  CreateIntegrationCardButton?: unknown;
  canCreateIntegration?: boolean;
  canUploadIntegrationPackage?: boolean;
  showCreatedIntegrations?: boolean;
}
let capturedSidebarProps: CapturedSidebarProps = {};
jest.mock('./components/side_bar', () => ({
  Sidebar: (props: CapturedSidebarProps) => {
    capturedSidebarProps = props;
    return null;
  },
}));
jest.mock('./components/no_data_prompt', () => ({ NoDataPrompt: () => null }));
jest.mock('./components/manage_integrations_table', () => ({
  ManageIntegrationsTable: () => null,
}));
jest.mock('../../components/no_epr_callout', () => ({ NoEprCallout: () => null }));

import { OBLT_DEFAULT_CATEGORIES } from '../../../../../../../common/constants';

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
  allCards: [],
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
    capturedFilteredCards = [];
    capturedSidebarProps = {};
    mockUseAutomaticImportAuthz.mockReturnValue(NO_AUTHZ);
    mockUseAuthz.mockReturnValue({ integrations: { uploadPackages: false } });
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
        expect(mockSetUrlDefaultCategoriesFn).toHaveBeenCalledWith([...OBLT_DEFAULT_CATEGORIES], {
          replace: true,
        });
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

  describe('collection flyout URL state', () => {
    const nginxCollectionCard = {
      id: 'collection:nginx',
      name: 'nginx',
      title: 'Nginx',
      description: 'Nginx variants',
      isCollectionCard: true,
      url: '/app/integrations/browse',
      categories: [],
      icons: [],
      integration: '',
      version: '',
      groupMembers: [
        {
          id: 'epr:nginx-1',
          name: 'nginx',
          title: 'Nginx',
          description: 'Nginx standard',
          url: '/app/integrations/detail/nginx-1.0/overview',
          icons: [],
          categories: [],
          integration: '',
          version: '1.0.0',
        },
      ],
    };

    it('renders the CollectionFlyout when ?collection=nginx is in the URL', async () => {
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({
          filteredCards: [nginxCollectionCard],
          allCards: [nginxCollectionCard],
        })
      );
      mockUseLocation.mockReturnValue({
        pathname: '/app/integrations/browse',
        search: '?collection=nginx',
      });
      const { getByTestId } = renderPage();
      await waitFor(() => {
        expect(getByTestId('collectionFlyout')).toBeInTheDocument();
      });
    });

    it('does not render the CollectionFlyout when no ?collection param is present', async () => {
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({ allCards: [nginxCollectionCard] })
      );
      const { queryByTestId } = renderPage();
      await waitFor(() => {
        expect(queryByTestId('collectionFlyout')).not.toBeInTheDocument();
      });
    });

    it('calls history.replace without the collection param when the flyout is closed', async () => {
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({
          filteredCards: [nginxCollectionCard],
          allCards: [nginxCollectionCard],
        })
      );
      mockUseLocation.mockReturnValue({
        pathname: '/app/integrations/browse',
        search: '?collection=nginx',
      });
      const { getByLabelText } = renderPage();
      await waitFor(() => getByLabelText('Close this dialog'));
      fireEvent.click(getByLabelText('Close this dialog'));
      expect(mockHistoryReplace).toHaveBeenCalledWith(
        expect.objectContaining({ search: expect.not.stringContaining('collection') })
      );
    });

    it('calls history.replace without the collection param when a filter removes the open collection', async () => {
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({
          filteredCards: [nginxCollectionCard],
          allCards: [nginxCollectionCard],
        })
      );
      mockUseLocation.mockReturnValue({
        pathname: '/app/integrations/browse',
        search: '?collection=nginx',
      });
      const { rerender } = renderPage();
      await waitFor(() => {
        expect(capturedFilteredCards.some((c) => c.isCollectionCard)).toBe(true);
      });

      mockHistoryReplace.mockClear();

      // Simulate a filter removing the open collection
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({
          filteredCards: [],
          allCards: [nginxCollectionCard],
        })
      );
      rerender(
        <I18nProvider>
          <EuiThemeProvider>
            <BrowseIntegrationsPage prereleaseIntegrationsEnabled={false} />
          </EuiThemeProvider>
        </I18nProvider>
      );

      await waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledWith(
          expect.objectContaining({ search: expect.not.stringContaining('collection') })
        );
      });
    });

    it('calls history.replace with the collection param when a collection card is clicked', async () => {
      mockUseBrowseIntegrationHook.mockReturnValue(
        makeDefaultHookReturn({
          filteredCards: [nginxCollectionCard],
          allCards: [nginxCollectionCard],
        })
      );
      renderPage();

      // BrowseIntegrationsPage overrides onCardClick on collection cards to call openCollection.
      // Access it via the captured list prop on ResponsivePackageGrid.
      await waitFor(() => {
        expect(capturedFilteredCards.length).toBeGreaterThan(0);
      });
      const card = capturedFilteredCards.find((c) => c.isCollectionCard);
      expect(card?.onCardClick).toBeDefined();
      card!.onCardClick!();

      expect(mockHistoryReplace).toHaveBeenCalledWith(
        expect.objectContaining({ search: expect.stringContaining('collection=nginx') })
      );
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

    it('does not offer the Create integration card to a read-only user who cannot upload packages', async () => {
      mockUseAutomaticImportAuthz.mockReturnValue({ ...NO_AUTHZ, canView: true });
      renderPage();

      await waitFor(() => {
        expect(capturedSidebarProps).toHaveProperty('CreateIntegrationCardButton');
      });
      expect(capturedSidebarProps.CreateIntegrationCardButton).toBeUndefined();
    });

    it('offers the card with upload only to a read-only user who can upload packages', async () => {
      mockUseAutomaticImportAuthz.mockReturnValue({ ...NO_AUTHZ, canView: true });
      mockUseAuthz.mockReturnValue({ integrations: { uploadPackages: true } });
      renderPage();

      await waitFor(() => {
        expect(capturedSidebarProps.CreateIntegrationCardButton).toBe(
          CreateIntegrationSideCardButton
        );
      });
      expect(capturedSidebarProps.canCreateIntegration).toBe(false);
      expect(capturedSidebarProps.canUploadIntegrationPackage).toBe(true);
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
