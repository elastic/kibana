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
import { useUrlCategories, useUrlDefaultCategories, useSetUrlCategory } from './url_categories';
import { useLocalSearch } from '../../../../../hooks';

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
    (useUrlDefaultCategories as jest.Mock).mockReturnValue([]);
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
      allCards: cards,
      availableSubCategories: [],
    });
  };

  describe('Deprecated filter', () => {
    it('returns all integrations, including deprecated, when status includes deprecated', () => {
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

      expect(result.current.filteredCards).toHaveLength(4);
      expect(result.current.filteredCards).toEqual(cards);
    });

    it('hides deprecated integrations by default when status is undefined', () => {
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

      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.filteredCards).toEqual([
        { id: '1', name: 'Integration 1', isDeprecated: false },
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

      // Should include integrations without isDeprecated property (treated as non-deprecated),
      // but hide the one that is explicitly deprecated (default hide-deprecated behavior).
      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.filteredCards).toEqual([
        { id: '1', name: 'Integration 1' },
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

  describe('Stale-state regression (issue #265510)', () => {
    it('shows correct results after category changes when initial URL has a category', () => {
      // Simulate hard refresh with ?category=apm: useAvailablePackages returns allCards
      // (all packages, no pre-filtering). useBrowseIntegrationHook applies category
      // from live URL. When URL changes to security, security cards must be visible.
      const cards = [
        { id: 'apm-1', name: 'apm', title: 'APM', categories: ['apm'] },
        { id: 'security-1', name: 'security', title: 'Security App', categories: ['security'] },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);

      // Simulate URL now showing security category (user changed from apm)
      (useUrlCategories as jest.Mock).mockReturnValue({
        category: 'security',
        subCategory: undefined,
      });
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      // Must show security cards, not 0 results
      expect(result.current.filteredCards).toHaveLength(1);
      expect(result.current.filteredCards[0].categories).toContain('security');
    });

    it('shows non-agentless packages after agentless filter is removed', () => {
      // Simulate hard refresh with ?setupMethod=agentless: useAvailablePackages returns
      // allCards (all packages). When user removes the agentless filter, non-agentless
      // packages must become visible.
      const cards = [
        {
          id: 'regular-1',
          name: 'nginx',
          title: 'Nginx',
          categories: ['web'],
          supportsAgentless: false,
          type: 'integration',
        },
        {
          id: 'agentless-1',
          name: 'aws',
          title: 'AWS',
          categories: ['cloud'],
          supportsAgentless: true,
          type: 'integration',
        },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);

      // URL no longer has setupMethod filter (user removed it)
      (useUrlCategories as jest.Mock).mockReturnValue({
        category: '',
        subCategory: undefined,
      });
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
        setupMethod: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      // Both cards must be visible when agentless filter is removed
      expect(result.current.filteredCards).toHaveLength(2);
    });
  });

  describe('Multi-category (AND) filter', () => {
    it('shows only cards that belong to ALL selected default categories (intersection)', () => {
      const cards = [
        {
          id: '1',
          name: 'both',
          title: 'Both',
          categories: ['observability', 'opentelemetry'],
        },
        { id: '2', name: 'obs-only', title: 'Obs only', categories: ['observability'] },
        { id: '3', name: 'otel-only', title: 'OTel only', categories: ['opentelemetry'] },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlDefaultCategories as jest.Mock).mockReturnValue(['observability', 'opentelemetry']);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      // Only the card present in BOTH categories should remain
      expect(result.current.filteredCards).toHaveLength(1);
      expect(result.current.filteredCards[0].name).toBe('both');
    });
  });

  describe('Collection card filtering', () => {
    const makeCollection = (
      name: string,
      members: Array<Partial<IntegrationCardItem>>
    ): IntegrationCardItem => {
      const allCategories = [...new Set(members.flatMap((m) => m.categories ?? []))];
      return {
        id: `collection:${name}`,
        name,
        title: name.charAt(0).toUpperCase() + name.slice(1),
        description: `${name} collection`,
        isCollectionCard: true,
        categories: allCategories,
        groupMembers: members.map((m, i) => ({
          id: `epr:${name}-${i}`,
          name: `${name}-${i}`,
          title: `${name} variant ${i}`,
          description: '',
          url: `/detail/${name}-${i}/overview`,
          icons: [],
          version: '1.0.0',
          integration: '',
          ...m,
        })) as IntegrationCardItem[],
        url: '',
        icons: [],
        version: '',
        integration: '',
      } as unknown as IntegrationCardItem;
    };

    const baseUrlFilters = { q: undefined, sort: undefined, status: undefined };

    describe('category filter', () => {
      it('filters groupMembers and recomputes categories when multiple members match', () => {
        // Two members match 'opentelemetry'; one has only 'web' (removed). After filtering,
        // categories must be recomputed from survivors so 'security' (only on the removed
        // member) no longer appears.
        const collection = makeCollection('nginx', [
          { categories: ['opentelemetry'] },
          { categories: ['opentelemetry', 'web'] },
          { categories: ['web', 'security'] }, // removed by filter
        ]);

        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        (useUrlCategories as jest.Mock).mockReturnValue({
          category: 'opentelemetry',
          subCategory: undefined,
        });
        (useUrlFilters as jest.Mock).mockReturnValue(baseUrlFilters);

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        expect(result.current.filteredCards).toHaveLength(1);
        const card = result.current.filteredCards[0];
        expect(card.isCollectionCard).toBe(true);
        expect(card.groupMembers).toHaveLength(2);
        // categories recomputed from survivors only — 'security' is gone
        expect(card.categories).toContain('opentelemetry');
        expect(card.categories).toContain('web');
        expect(card.categories).not.toContain('security');
      });

      it('degrades a collection to an individual tile when only one member matches', () => {
        const collection = makeCollection('nginx', [
          { categories: ['web', 'opentelemetry'] },
          { categories: ['web'] },
        ]);

        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        (useUrlCategories as jest.Mock).mockReturnValue({
          category: 'opentelemetry',
          subCategory: undefined,
        });
        (useUrlFilters as jest.Mock).mockReturnValue(baseUrlFilters);

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        expect(result.current.filteredCards).toHaveLength(1);
        expect(result.current.filteredCards[0].isCollectionCard).toBeFalsy();
      });

      it('excludes a collection when no member matches the category', () => {
        const collection = makeCollection('nginx', [
          { categories: ['web'] },
          { categories: ['web'] },
        ]);

        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        (useUrlCategories as jest.Mock).mockReturnValue({
          category: 'opentelemetry',
          subCategory: undefined,
        });
        (useUrlFilters as jest.Mock).mockReturnValue(baseUrlFilters);

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        expect(result.current.filteredCards).toHaveLength(0);
      });
    });

    describe('setupMethod filter', () => {
      it('filters groupMembers by agentless and keeps collection when multiple members survive', () => {
        const collection = makeCollection('nginx', [
          { supportsAgentless: true, type: 'integration', categories: ['web'] },
          { supportsAgentless: true, type: 'integration', categories: ['web'] },
          { supportsAgentless: false, type: 'integration', categories: ['web'] },
        ]);

        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        (useUrlFilters as jest.Mock).mockReturnValue({
          ...baseUrlFilters,
          setupMethod: ['agentless'],
        });

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        expect(result.current.filteredCards).toHaveLength(1);
        expect(result.current.filteredCards[0].isCollectionCard).toBe(true);
        expect(result.current.filteredCards[0].groupMembers).toHaveLength(2);
      });

      it('does not promote a deprecated singleton when deprecated filter is off', () => {
        const collection = makeCollection('nginx', [
          {
            supportsAgentless: true,
            type: 'integration',
            categories: ['web'],
            isDeprecated: true,
          } as Partial<IntegrationCardItem>,
          { supportsAgentless: false, type: 'integration', categories: ['web'] },
        ]);

        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        (useUrlFilters as jest.Mock).mockReturnValue({
          ...baseUrlFilters,
          setupMethod: ['agentless'],
          status: undefined,
        });

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        // Only the deprecated member supports agentless → singleton, but it is deprecated
        // and the deprecated filter is off, so the card must be suppressed entirely.
        expect(result.current.filteredCards).toHaveLength(0);
      });
    });

    describe('signal filter', () => {
      it('filters groupMembers by signal type', () => {
        const collection = makeCollection('nginx', [
          { signalTypes: ['logs', 'metrics'], categories: ['web'] },
          { signalTypes: ['metrics'], categories: ['web'] },
          { signalTypes: ['traces'], categories: ['web'] },
        ]);

        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        (useUrlFilters as jest.Mock).mockReturnValue({
          ...baseUrlFilters,
          signal: ['logs'],
        });

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        // Only the first member has 'logs' → singleton degradation
        expect(result.current.filteredCards).toHaveLength(1);
        expect(result.current.filteredCards[0].isCollectionCard).toBeFalsy();
      });
    });

    describe('sort stability after singleton degradation', () => {
      it('re-sorts A-Z after a collection degrades to a singleton with a title that crosses another card', () => {
        // The "apache" collection (title "Apache", sorts at A) has one member in the
        // 'opentelemetry' category whose title starts with T ("Tomcat OTel"). After the
        // category filter, only "Tomcat OTel" survives (singleton degradation). Without
        // a re-sort, "Tomcat OTel" would occupy the "A" slot — before "Nginx" — even
        // though T > N alphabetically. The re-sort must move it after "Nginx".
        const apacheCollection = makeCollection('apache', [
          { title: 'Tomcat OTel', categories: ['web', 'opentelemetry'] },
          { title: 'Apache ECS', categories: ['web'] },
        ]);
        const nginxCard = {
          id: 'epr:nginx',
          name: 'nginx',
          title: 'Nginx',
          categories: ['web', 'opentelemetry'],
          type: 'integration',
        } as unknown as IntegrationCardItem;

        // A-Z: apache collection (A) comes before nginx (N) in the pre-filter sort
        mockUseAvailablePackages([apacheCollection, nginxCard] as IntegrationCardItem[]);
        (useUrlCategories as jest.Mock).mockReturnValue({
          category: 'opentelemetry',
          subCategory: undefined,
        });
        (useUrlFilters as jest.Mock).mockReturnValue({ ...baseUrlFilters, sort: 'a-z' });

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        // apache collection degrades to 'Tomcat OTel'; re-sorted A-Z: Nginx (N) < Tomcat OTel (T)
        expect(result.current.filteredCards.map((c) => c.title)).toEqual(['Nginx', 'Tomcat OTel']);
      });
    });

    describe('search revalidation after member filtering', () => {
      const mockSearchReturning = (cards: IntegrationCardItem[]) => {
        (useLocalSearch as jest.Mock).mockReturnValue({
          search: jest.fn().mockReturnValue(cards),
        });
      };

      it('drops a collection when the matched member is removed by a setup-method filter', () => {
        // Search "ecs" finds collection via ECS member. Agentless filter removes ECS member.
        // Surviving OTel member has no "ecs" in its text → collection must be dropped.
        const collection = makeCollection('nginx', [
          {
            title: 'Nginx ECS',
            type: 'integration',
            supportsAgentless: false,
            categories: ['web'],
          },
          {
            title: 'Nginx OTel',
            type: 'integration',
            supportsAgentless: true,
            categories: ['web'],
          },
        ]);
        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        mockSearchReturning([collection]);
        (useUrlFilters as jest.Mock).mockReturnValue({
          ...baseUrlFilters,
          q: 'ecs',
          setupMethod: ['agentless'],
        });

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        expect(result.current.filteredCards).toHaveLength(0);
      });

      it('keeps a collection when surviving members still contain the search term', () => {
        // Search "nginx" finds collection. Agentless filter removes ECS member.
        // Two agentless members survive so the collection stays intact (no singleton
        // degradation). Both survivors contain "nginx" → collection is kept.
        const collection = makeCollection('nginx', [
          {
            title: 'Nginx ECS',
            type: 'integration',
            supportsAgentless: false,
            categories: ['web'],
          },
          {
            title: 'Nginx OTel',
            type: 'integration',
            supportsAgentless: true,
            categories: ['web'],
          },
          {
            title: 'Nginx Metrics',
            type: 'integration',
            supportsAgentless: true,
            categories: ['web'],
          },
        ]);
        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        mockSearchReturning([collection]);
        (useUrlFilters as jest.Mock).mockReturnValue({
          ...baseUrlFilters,
          q: 'nginx',
          setupMethod: ['agentless'],
        });

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        expect(result.current.filteredCards).toHaveLength(1);
        expect(result.current.filteredCards[0].isCollectionCard).toBeTruthy();
        expect(result.current.filteredCards[0].groupMembers).toHaveLength(2);
      });

      it('keeps a collection matched by its own title even when member text does not contain the term', () => {
        // "Observability Suite" is the collection title. Members have unrelated names.
        // Search "observability" matches the collection title (indexed by useLocalSearch).
        // Secondary check must not drop it when its searchableContent lacks "observability".
        const collection = {
          ...makeCollection('obs-suite', [
            { title: 'Metrics Agent', type: 'integration', categories: ['web'] },
            { title: 'Logs Agent', type: 'integration', categories: ['web'] },
          ]),
          title: 'Observability Suite',
        } as IntegrationCardItem;
        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        mockSearchReturning([collection]);
        (useUrlFilters as jest.Mock).mockReturnValue({
          ...baseUrlFilters,
          q: 'observability',
        });

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        // Collection matched via its own title, not member text — must survive
        expect(result.current.filteredCards).toHaveLength(1);
        expect(result.current.filteredCards[0].isCollectionCard).toBeTruthy();
      });

      it('drops a promoted singleton when only the removed member matched the search', () => {
        // Search "ecs" finds collection. Signal filter leaves only OTel member → singleton.
        // Promoted singleton ("Nginx OTel") has no "ecs" in its text → must be dropped.
        const collection = makeCollection('nginx', [
          {
            title: 'Nginx ECS',
            type: 'integration',
            signalTypes: ['metrics'],
            categories: ['web'],
          },
          {
            title: 'Nginx OTel',
            type: 'integration',
            signalTypes: ['traces'],
            categories: ['web'],
          },
        ]);
        mockUseAvailablePackages([collection] as IntegrationCardItem[]);
        mockSearchReturning([collection]);
        (useUrlFilters as jest.Mock).mockReturnValue({
          ...baseUrlFilters,
          q: 'ecs',
          signal: ['traces'],
        });

        const { result } = renderHook(() =>
          useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
        );

        expect(result.current.filteredCards).toHaveLength(0);
      });
    });
  });

  describe('Combined filters', () => {
    it('includes deprecated integrations and sorts a-z when status includes deprecated', () => {
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

      expect(result.current.filteredCards).toHaveLength(4);
      expect(result.current.filteredCards.map((c) => c.title)).toEqual([
        'Apache HTTP Server',
        'MySQL Database',
        'Nginx Web Server',
        'Zebra Integration',
      ]);
    });
  });

  describe('Content pack filter', () => {
    it('hides content packs by default (showContent falsy)', () => {
      const cards = [
        { id: '1', name: 'nginx', title: 'Nginx', type: 'integration', categories: ['web'] },
        {
          id: '2',
          name: 'nginx-content',
          title: 'Nginx Content',
          type: 'content',
          categories: ['web'],
        },
        { id: '3', name: 'redis', title: 'Redis', type: 'integration', categories: ['database'] },
        {
          id: '4',
          name: 'redis-content',
          title: 'Redis Content',
          type: 'content',
          categories: ['database'],
        },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
        showContent: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.filteredCards.map((c) => c.name)).toEqual(['nginx', 'redis']);
    });

    it('shows content packs when showContent is true', () => {
      const cards = [
        { id: '1', name: 'nginx', title: 'Nginx', type: 'integration', categories: ['web'] },
        {
          id: '2',
          name: 'nginx-content',
          title: 'Nginx Content',
          type: 'content',
          categories: ['web'],
        },
        { id: '3', name: 'redis', title: 'Redis', type: 'integration', categories: ['database'] },
        {
          id: '4',
          name: 'redis-content',
          title: 'Redis Content',
          type: 'content',
          categories: ['database'],
        },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
        showContent: true,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(4);
      expect(result.current.filteredCards.map((c) => c.name)).toEqual([
        'nginx',
        'nginx-content',
        'redis',
        'redis-content',
      ]);
    });

    it('updates category counts to exclude content packs when showContent is false', () => {
      const cards = [
        { id: '1', name: 'nginx', title: 'Nginx', type: 'integration', categories: ['web'] },
        {
          id: '2',
          name: 'nginx-content',
          title: 'Nginx Content',
          type: 'content',
          categories: ['web'],
        },
      ];

      const allCategories = [
        { id: '', title: 'All categories', count: 2 },
        { id: 'web', title: 'Web', count: 2 },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[], { allCategories });
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
        showContent: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      // Content pack hidden → counts drop by 1
      expect(result.current.mainCategories).toEqual([
        { id: '', title: 'All categories', count: 1 },
        { id: 'web', title: 'Web', count: 1 },
      ]);
    });

    it('keeps non-content packages (input type) visible when showContent is false', () => {
      const cards = [
        { id: '1', name: 'nginx', title: 'Nginx', type: 'integration', categories: ['web'] },
        { id: '2', name: 'custom', title: 'Custom Input', type: 'input', categories: ['web'] },
        {
          id: '3',
          name: 'nginx-content',
          title: 'Nginx Content',
          type: 'content',
          categories: ['web'],
        },
      ];

      mockUseAvailablePackages(cards as IntegrationCardItem[]);
      (useUrlFilters as jest.Mock).mockReturnValue({
        q: undefined,
        sort: undefined,
        status: undefined,
        showContent: undefined,
      });

      const { result } = renderHook(() =>
        useBrowseIntegrationHook({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.filteredCards.map((c) => c.type)).toEqual(['integration', 'input']);
    });
  });
});
