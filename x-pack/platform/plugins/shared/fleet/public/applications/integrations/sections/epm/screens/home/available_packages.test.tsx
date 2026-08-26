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

const mockUseAvailablePackages = jest.fn();
jest.mock('./hooks/use_available_packages', () => ({
  useAvailablePackages: () => mockUseAvailablePackages(),
}));

jest.mock('../../../../hooks', () => ({
  useBreadcrumbs: jest.fn(),
}));

// Capture the list prop so tests can invoke injected onCardClick handlers directly.
let capturedFilteredCards: Array<{ isCollectionCard?: boolean; onCardClick?: () => void }> = [];
jest.mock('../../components/package_list_grid', () => ({
  PackageListGrid: ({ list }: { list: any[] }) => {
    capturedFilteredCards = list;
    return null;
  },
}));
jest.mock('../../components/integration_preference', () => ({
  IntegrationPreference: () => null,
}));
jest.mock('../../components/agentless_filter', () => ({ AgentlessFilter: () => null }));
jest.mock('../../components/no_epr_callout', () => ({ NoEprCallout: () => null }));
jest.mock('./category_facets', () => ({ CategoryFacets: () => null }));

const mockUseLocation = jest.fn();
const mockHistoryReplace = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: () => mockUseLocation(),
  useHistory: () => ({ replace: mockHistoryReplace }),
}));

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
  setCategory: jest.fn(),
  allCategories: [{ id: '', title: 'All categories', count: 5 }],
  mainCategories: [{ id: '', title: 'All categories', count: 5 }],
  preference: 'agent',
  setPreference: jest.fn(),
  onlyAgentlessFilter: false,
  setOnlyAgentlessFilter: jest.fn(),
  isAgentlessEnabled: false,
  isLoading: false,
  isLoadingCategories: false,
  isLoadingAllPackages: false,
  isLoadingAppendCustomIntegrations: false,
  eprPackageLoadingError: undefined,
  eprCategoryLoadingError: undefined,
  searchTerm: '',
  setSearchTerm: jest.fn(),
  setUrlandPushHistory: jest.fn(),
  setUrlandReplaceHistory: jest.fn(),
  filteredCards: [],
  allCards: [],
  availableSubCategories: [],
  selectedSubCategory: undefined,
  setSelectedSubCategory: jest.fn(),
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
    jest.clearAllMocks();
    capturedFilteredCards = [];
    mockUseAvailablePackages.mockReturnValue(makeDefaultHookReturn());
    mockUseLocation.mockReturnValue({ pathname: '/app/integrations/browse', search: '' });
  });

  it('renders the CollectionFlyout when ?collection=nginx is in the URL', async () => {
    mockUseAvailablePackages.mockReturnValue(
      makeDefaultHookReturn({ allCards: [nginxCollectionCard] })
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
      makeDefaultHookReturn({ allCards: [nginxCollectionCard] })
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
