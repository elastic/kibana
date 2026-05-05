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

  const mockUseAvailablePackages = (
    cards: IntegrationCardItem[] = [],
    {
      allCategories = [],
      mainCategories = [],
    }: {
      allCategories?: Array<{ id: string; title: string; count: number; parent_id?: string }>;
      mainCategories?: Array<{ id: string; title: string; count: number }>;
    } = {}
  ) => {
    (useAvailablePackages as jest.Mock).mockReturnValue({
      initialSelectedCategory: '',
      allCategories,
      mainCategories,
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
    it('sorts integrations A-Z by title when sort=a-z', () => {
      const cards = [
        { id: '1', name: 'zebra', title: 'Zebra Integration' },
        { id: '2', name: 'apache', title: 'Apache HTTP Server' },
        { id: '3', name: 'mysql', title: 'MySQL Database' },
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

      expect(result.current.filteredCards.map((c) => c.title)).toEqual([
        'Apache HTTP Server',
        'MySQL Database',
        'Zebra Integration',
      ]);
    });

    it('sorts integrations Z-A by title when sort=z-a', () => {
      const cards = [
        { id: '1', name: 'zebra', title: 'Zebra Integration' },
        { id: '2', name: 'apache', title: 'Apache HTTP Server' },
        { id: '3', name: 'mysql', title: 'MySQL Database' },
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

      expect(result.current.filteredCards.map((c) => c.title)).toEqual([
        'Zebra Integration',
        'MySQL Database',
        'Apache HTTP Server',
      ]);
    });
  });

  describe('Category counts update with filters', () => {
    it('updates category counts when setup method filter is applied', () => {
      const cards = [
        {
          id: '1',
          name: 'AWS CloudTrail',
          categories: ['security', 'cloud'],
          supportsAgentless: true,
          type: 'integration',
        },
        {
          id: '2',
          name: 'AWS S3',
          categories: ['cloud'],
          supportsAgentless: true,
          type: 'integration',
        },
        {
          id: '3',
          name: 'Nginx',
          categories: ['web'],
          supportsAgentless: false,
          type: 'integration',
        },
        {
          id: '4',
          name: 'Apache',
          categories: ['web', 'security'],
          supportsAgentless: false,
          type: 'integration',
        },
      ];

      const allCategories = [
        { id: '', title: 'All categories', count: 4 },
        { id: 'cloud', title: 'Cloud', count: 2 },
        { id: 'security', title: 'Security', count: 2 },
        { id: 'web', title: 'Web', count: 2 },
      ];
      const mainCategories = allCategories;

      mockUseAvailablePackages(cards as IntegrationCardItem[], { allCategories, mainCategories });
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
        setupMethod: ['agentless'],
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      // Only 2 agentless cards, so counts should reflect that
      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.mainCategories).toEqual([
        { id: '', title: 'All categories', count: 2 },
        { id: 'cloud', title: 'Cloud', count: 2 },
        { id: 'security', title: 'Security', count: 1 },
        { id: 'web', title: 'Web', count: 0 },
      ]);
    });

    it('updates category counts when signal filter is applied', () => {
      const cards = [
        { id: '1', name: 'Integration 1', categories: ['security'], signalTypes: ['logs'] },
        {
          id: '2',
          name: 'Integration 2',
          categories: ['security', 'cloud'],
          signalTypes: ['metrics'],
        },
        { id: '3', name: 'Integration 3', categories: ['cloud'], signalTypes: ['logs', 'metrics'] },
      ];

      const allCategories = [
        { id: '', title: 'All categories', count: 3 },
        { id: 'cloud', title: 'Cloud', count: 2 },
        { id: 'security', title: 'Security', count: 2 },
      ];
      const mainCategories = allCategories;

      mockUseAvailablePackages(cards as IntegrationCardItem[], { allCategories, mainCategories });
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
        signal: ['logs'],
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      // Cards 1 and 3 have 'logs' signal
      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.mainCategories).toEqual([
        { id: '', title: 'All categories', count: 2 },
        { id: 'cloud', title: 'Cloud', count: 1 },
        { id: 'security', title: 'Security', count: 1 },
      ]);
    });

    it('shows unfiltered counts when no filters are applied', () => {
      const cards = [
        { id: '1', name: 'Integration 1', categories: ['security'] },
        { id: '2', name: 'Integration 2', categories: ['cloud'] },
      ];

      const allCategories = [
        { id: '', title: 'All categories', count: 2 },
        { id: 'cloud', title: 'Cloud', count: 1 },
        { id: 'security', title: 'Security', count: 1 },
      ];
      const mainCategories = allCategories;

      mockUseAvailablePackages(cards as IntegrationCardItem[], { allCategories, mainCategories });
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.mainCategories).toEqual([
        { id: '', title: 'All categories', count: 2 },
        { id: 'cloud', title: 'Cloud', count: 1 },
        { id: 'security', title: 'Security', count: 1 },
      ]);
    });
  });

  describe('Combined filters', () => {
    it('applies deprecated filter and sorting together', () => {
      const cards = [
        { id: '1', name: 'zebra', title: 'Zebra Integration', isDeprecated: false },
        { id: '2', name: 'apache', title: 'Apache HTTP Server', isDeprecated: true },
        { id: '3', name: 'mysql', title: 'MySQL Database', isDeprecated: false },
        { id: '4', name: 'nginx', title: 'Nginx Web Server', isDeprecated: true },
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
      expect(result.current.filteredCards.map((c) => c.title)).toEqual([
        'Apache HTTP Server',
        'Nginx Web Server',
      ]);
    });
  });
});
