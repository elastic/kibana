/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

const mockUseUrlFilters = jest.fn();
const mockUseAddUrlFilters = jest.fn();
const mockUseUrlCategories = jest.fn();
const mockUseSetUrlCategory = jest.fn();
const mockUseUrlDefaultCategories = jest.fn();

jest.mock('../hooks/url_filters', () => ({
  useUrlFilters: () => mockUseUrlFilters(),
  useAddUrlFilters: () => mockUseAddUrlFilters(),
}));

jest.mock('../hooks/url_categories', () => ({
  useUrlCategories: () => mockUseUrlCategories(),
  useSetUrlCategory: () => mockUseSetUrlCategory(),
  useUrlDefaultCategories: () => mockUseUrlDefaultCategories(),
}));

jest.mock('../../../../../hooks', () => ({}));

import { SearchAndFiltersBar } from './search_and_filters_bar';

describe('SearchAndFiltersBar', () => {
  const mockAddUrlFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUrlFilters.mockReturnValue({
      q: undefined,
      sort: undefined,
      status: undefined,
    });
    mockUseAddUrlFilters.mockReturnValue(mockAddUrlFilters);
    mockUseUrlCategories.mockReturnValue({
      category: '',
      subCategory: undefined,
    });
    mockUseSetUrlCategory.mockReturnValue(jest.fn());
    mockUseUrlDefaultCategories.mockReturnValue([]);
  });

  function renderSearchAndFiltersBar() {
    return render(
      <I18nProvider>
        <EuiThemeProvider>
          <SearchAndFiltersBar />
        </EuiThemeProvider>
      </I18nProvider>
    );
  }

  describe('More Filter', () => {
    it('renders the more filter button', () => {
      const { getByTestId } = renderSearchAndFiltersBar();
      expect(getByTestId('browseIntegrations.searchBar.moreBtn')).toBeInTheDocument();
    });

    it('shows both options active by default (deprecated and content packs hidden)', () => {
      const { getByTestId } = renderSearchAndFiltersBar();
      const button = getByTestId('browseIntegrations.searchBar.moreBtn');

      expect(button).toHaveClass('euiFilterButton-hasActiveFilters');

      const badge = button.querySelector('.euiNotificationBadge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2');
    });

    it('shows only one active option when deprecated integrations are shown', () => {
      mockUseUrlFilters.mockReturnValue({
        q: undefined,
        sort: undefined,
        status: ['deprecated'],
      });

      const { getByTestId } = renderSearchAndFiltersBar();
      const button = getByTestId('browseIntegrations.searchBar.moreBtn');

      const badge = button.querySelector('.euiNotificationBadge');
      expect(badge).toHaveTextContent('1');
    });

    it('calls addUrlFilters with status: ["deprecated"] when hide-deprecated is unchecked', async () => {
      const { getByTestId } = renderSearchAndFiltersBar();

      fireEvent.click(getByTestId('browseIntegrations.searchBar.moreBtn'));

      const deprecatedOption = getByTestId('browseIntegrations.searchBar.moreHideDeprecatedOption');
      fireEvent.click(deprecatedOption);

      await waitFor(() => {
        expect(mockAddUrlFilters).toHaveBeenCalledWith({
          status: ['deprecated'],
          showContent: undefined,
        });
      });
    });

    it('calls addUrlFilters with status: undefined when hide-deprecated is re-checked', async () => {
      mockUseUrlFilters.mockReturnValue({
        q: undefined,
        sort: undefined,
        status: ['deprecated'],
      });

      const { getByTestId } = renderSearchAndFiltersBar();

      fireEvent.click(getByTestId('browseIntegrations.searchBar.moreBtn'));

      const deprecatedOption = getByTestId('browseIntegrations.searchBar.moreHideDeprecatedOption');
      fireEvent.click(deprecatedOption);

      await waitFor(() => {
        expect(mockAddUrlFilters).toHaveBeenCalledWith({
          status: undefined,
          showContent: undefined,
        });
      });
    });

    it('calls addUrlFilters with showContent: true when hide-content-packs is unchecked', async () => {
      const { getByTestId } = renderSearchAndFiltersBar();

      fireEvent.click(getByTestId('browseIntegrations.searchBar.moreBtn'));

      const contentOption = getByTestId('browseIntegrations.searchBar.moreHideContentPacksOption');
      fireEvent.click(contentOption);

      await waitFor(() => {
        expect(mockAddUrlFilters).toHaveBeenCalledWith({
          status: undefined,
          showContent: true,
        });
      });
    });

    it('calls addUrlFilters with showContent: undefined when hide-content-packs is re-checked', async () => {
      mockUseUrlFilters.mockReturnValue({
        q: undefined,
        sort: undefined,
        showContent: true,
      });

      const { getByTestId } = renderSearchAndFiltersBar();

      fireEvent.click(getByTestId('browseIntegrations.searchBar.moreBtn'));

      const contentOption = getByTestId('browseIntegrations.searchBar.moreHideContentPacksOption');
      fireEvent.click(contentOption);

      await waitFor(() => {
        expect(mockAddUrlFilters).toHaveBeenCalledWith({
          status: undefined,
          showContent: undefined,
        });
      });
    });
  });

  describe('Search Bar', () => {
    it('renders the search input', () => {
      const { getByTestId } = renderSearchAndFiltersBar();
      expect(getByTestId('epmList.searchBar')).toBeInTheDocument();
    });

    it('displays the search query from URL', () => {
      mockUseUrlFilters.mockReturnValue({
        q: 'apache',
        sort: undefined,
        status: undefined,
      });

      const { getByTestId } = renderSearchAndFiltersBar();
      const searchInput = getByTestId('epmList.searchBar') as HTMLInputElement;

      expect(searchInput.value).toBe('apache');
    });
  });

  describe('Sort Filter', () => {
    it('renders the sort button', () => {
      const { getByTestId } = renderSearchAndFiltersBar();
      expect(getByTestId('browseIntegrations.searchBar.sortBtn')).toBeInTheDocument();
    });

    it('displays selected sort option', () => {
      mockUseUrlFilters.mockReturnValue({
        q: undefined,
        sort: 'a-z',
        status: undefined,
      });

      const { getByTestId } = renderSearchAndFiltersBar();
      const sortButton = getByTestId('browseIntegrations.searchBar.sortBtn');

      expect(sortButton).toHaveTextContent('A-Z');
    });
  });

  describe('Integration Tests', () => {
    it('all filter components work together', async () => {
      mockUseUrlFilters.mockReturnValue({
        q: 'apache',
        sort: 'a-z',
        status: ['deprecated'],
      });

      const { getByTestId } = renderSearchAndFiltersBar();

      // Search should show query
      const searchInput = getByTestId('epmList.searchBar') as HTMLInputElement;
      expect(searchInput.value).toBe('apache');

      // More filter should show count (content packs still hidden by default)
      const moreButton = getByTestId('browseIntegrations.searchBar.moreBtn');
      expect(moreButton).toHaveClass('euiFilterButton-hasActiveFilters');
      const badge = moreButton.querySelector('.euiNotificationBadge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('1');

      // Sort button should show selection
      const sortButton = getByTestId('browseIntegrations.searchBar.sortBtn');
      expect(sortButton).toHaveTextContent('A-Z');
    });
  });
});
