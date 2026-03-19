/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useAvailablePackages } from '../../home/hooks/use_available_packages';

import type { IntegrationCardItem } from '../../home/card_utils';

import { useBrowseIntegrationHook } from '.';
import { useUrlFilters } from './url_filters';
import { useUrlCategories, useSetUrlCategory } from './url_categories';

jest.mock('../../home/hooks/use_available_packages');
jest.mock('./url_filters');
jest.mock('./url_categories');
jest.mock('../../../../../hooks', () => ({
  searchIdField: 'id',
  useLocalSearch: jest.fn(),
}));

describe('useBrowseIntegrationHook', () => {
  const mockSetUrlCategory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useUrlCategories as jest.Mock).mockReturnValue({
      category: '',
      subCategory: undefined,
    });
    (useSetUrlCategory as jest.Mock).mockReturnValue(mockSetUrlCategory);
  });

  const mockUseAvailablePackages = (cards: IntegrationCardItem[] = []) => {
    (useAvailablePackages as jest.Mock).mockReturnValue({
      initialSelectedCategory: '',
      allCategories: [],
      mainCategories: [],
      isLoading: false,
      isLoadingCategories: false,
      isLoadingAllPackages: false,
      isLoadingAppendCustomIntegrations: false,
      eprPackageLoadingError: undefined,
      eprCategoryLoadingError: undefined,
      filteredCards: cards,
      availableSubCategories: [],
    });
  };

  describe('Deprecated filter', () => {
    it('Return only deprecated integrations when status includes deprecated', () => {
      const cards = [
        { id: '1', name: 'Integration 1', isDeprecated: false },
        { id: '2', name: 'Integration 2', isDeprecated: true },
        { id: '3', name: 'Integration 3', isDeprecated: true },
        { id: '4', name: 'Integration 4', isDeprecated: false },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: ['deprecated'],
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.filteredCards).toEqual([
        { id: '2', name: 'Integration 2', isDeprecated: true },
        { id: '3', name: 'Integration 3', isDeprecated: true },
      ]);
    });

    it('Return all integrations when status is undefined', () => {
      const cards = [
        { id: '1', name: 'Integration 1', isDeprecated: false },
        { id: '2', name: 'Integration 2', isDeprecated: true },
        { id: '3', name: 'Integration 3', isDeprecated: false },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(3);
      expect(result.current.filteredCards).toEqual([
        { id: '1', name: 'Integration 1', isDeprecated: false },
        { id: '2', name: 'Integration 2', isDeprecated: true },
        { id: '3', name: 'Integration 3', isDeprecated: false },
      ]);
    });

    it('handles integrations without isDeprecated property', () => {
      const cards = [
        { id: '1', name: 'Integration 1' },
        { id: '2', name: 'Integration 2', isDeprecated: true },
        { id: '3', name: 'Integration 3' },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      // Should include integrations without isDeprecated property (treated as non-deprecated)
      expect(result.current.filteredCards).toHaveLength(3);
      expect(result.current.filteredCards).toEqual([
        { id: '1', name: 'Integration 1' },
        { id: '2', name: 'Integration 2', isDeprecated: true },
        { id: '3', name: 'Integration 3' },
      ]);
    });
  });

  describe('Sorting', () => {
    it('sorts integrations A-Z when sort=a-z', () => {
      const cards = [
        { id: '1', name: 'Zebra' },
        { id: '2', name: 'Apache' },
        { id: '3', name: 'MySQL' },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: 'a-z',
        status: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards.map((c) => c.name)).toEqual(['Apache', 'MySQL', 'Zebra']);
    });

    it('sorts integrations Z-A when sort=z-a', () => {
      const cards = [
        { id: '1', name: 'Zebra' },
        { id: '2', name: 'Apache' },
        { id: '3', name: 'MySQL' },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: 'z-a',
        status: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards.map((c) => c.name)).toEqual(['Zebra', 'MySQL', 'Apache']);
    });
  });

  describe('Combined filters', () => {
    it('applies deprecated filter and sorting together', () => {
      const cards = [
        { id: '1', name: 'Zebra', isDeprecated: false },
        { id: '2', name: 'Apache', isDeprecated: true },
        { id: '3', name: 'MySQL', isDeprecated: false },
        { id: '4', name: 'Nginx', isDeprecated: true },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: 'a-z',
        status: ['deprecated'],
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.filteredCards.map((c) => c.name)).toEqual(['Apache', 'Nginx']);
    });
  });
});
