/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

const mockUseAvailablePackages = vi.fn();
vi.mock('./hooks/use_available_packages', () => {
      const mocked = {
      useAvailablePackages: () => mockUseAvailablePackages(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../hooks', () => {
      const mocked = {
      useBreadcrumbs: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

// Capture the list prop so tests can invoke injected onCardClick handlers directly.
let capturedFilteredCards: Array<{ isCollectionCard?: boolean; onCardClick?: () => void }> = [];
vi.mock('../../components/package_list_grid', () => {
      const mocked = {
      PackageListGrid: ({ list }: { list: any[] }) => {
        capturedFilteredCards = list;
        return null;
      },
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/integration_preference', () => {
      const mocked = {
      IntegrationPreference: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/agentless_filter', () => {
      const mocked = { AgentlessFilter: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/no_epr_callout', () => {
      const mocked = { NoEprCallout: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./category_facets', () => {
      const mocked = { CategoryFacets: () => null };
      return { ...mocked, default: mocked };
    });

const mockUseLocation = vi.fn();
const mockHistoryReplace = vi.fn();
vi.mock('react-router-dom', () => {
      const mocked = {
      useLocation: () => mockUseLocation(),
      useHistory: () => ({ replace: mockHistoryReplace }),
    };
      return { ...mocked, default: mocked };
    });

import { AvailablePackages } from './available_packages';

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

const makeDefaultHookReturn = (overrides = {}) => ({
  initialSelectedCategory: '',
  selectedCategory: '',
  setCategory: vi.fn(),
  allCategories: [{ id: '', title: 'All categories', count: 5 }],
  mainCategories: [{ id: '', title: 'All categories', count: 5 }],
  preference: 'agent',
  setPreference: vi.fn(),
  onlyAgentlessFilter: false,
  setOnlyAgentlessFilter: vi.fn(),
  isAgentlessEnabled: false,
  isLoading: false,
  isLoadingCategories: false,
  isLoadingAllPackages: false,
  isLoadingAppendCustomIntegrations: false,
  eprPackageLoadingError: undefined,
  eprCategoryLoadingError: undefined,
  searchTerm: '',
  setSearchTerm: vi.fn(),
  setUrlandPushHistory: vi.fn(),
  setUrlandReplaceHistory: vi.fn(),
  filteredCards: [],
  allCards: [],
  availableSubCategories: [],
  selectedSubCategory: undefined,
  setSelectedSubCategory: vi.fn(),
  ...overrides,
});

function renderPage() {
  return render(
    <I18nProvider>
      <EuiThemeProvider>
        <AvailablePackages prereleaseIntegrationsEnabled={false} />
      </EuiThemeProvider>
    </I18nProvider>
  );
}

describe('AvailablePackages — collection flyout URL state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFilteredCards = [];
    mockUseAvailablePackages.mockReturnValue(makeDefaultHookReturn());
    mockUseLocation.mockReturnValue({ pathname: '/app/integrations/browse', search: '' });
  });

  it('renders the CollectionFlyout when ?collection=nginx is in the URL', async () => {
    mockUseAvailablePackages.mockReturnValue(
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
    mockUseAvailablePackages.mockReturnValue(
      makeDefaultHookReturn({ allCards: [nginxCollectionCard] })
    );
    const { queryByTestId } = renderPage();
    await waitFor(() => {
      expect(queryByTestId('collectionFlyout')).not.toBeInTheDocument();
    });
  });

  it('calls history.replace without the collection param when a filter removes the open collection', async () => {
    mockUseAvailablePackages.mockReturnValue(
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
    mockUseAvailablePackages.mockReturnValue(
      makeDefaultHookReturn({
        filteredCards: [],
        allCards: [nginxCollectionCard],
      })
    );
    rerender(
      <I18nProvider>
        <EuiThemeProvider>
          <AvailablePackages prereleaseIntegrationsEnabled={false} />
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
    mockUseAvailablePackages.mockReturnValue(
      makeDefaultHookReturn({
        filteredCards: [nginxCollectionCard],
        allCards: [nginxCollectionCard],
      })
    );
    renderPage();

    // AvailablePackages overrides onCardClick on collection cards to call openCollection.
    // Access it via the captured list prop on PackageListGrid.
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

  it('calls history.replace without the collection param when the flyout is closed', async () => {
    mockUseAvailablePackages.mockReturnValue(
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
});
