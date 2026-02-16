/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import type { PackageListItem } from '../../../../../types';

const mockUseAgentless = jest.fn();
const mockUseGetPackageVerificationKeyId = jest.fn();
const mockUseGetPackagesQuery = jest.fn();
const mockUseGetCategoriesQuery = jest.fn();
const mockUseGetAppendCustomIntegrationsQuery = jest.fn();
const mockUseGetReplacementCustomIntegrationsQuery = jest.fn();
const mockUseMergeEprPackagesWithReplacements = jest.fn();
const mockUseBuildIntegrationsUrl = jest.fn();

jest.mock(
  '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks/setup_technology',
  () => ({
    useAgentless: () => mockUseAgentless(),
  })
);

jest.mock('../../../../../hooks', () => ({
  useGetPackagesQuery: (params: any) => mockUseGetPackagesQuery(params),
  useGetCategoriesQuery: (params: any) => mockUseGetCategoriesQuery(params),
  useGetAppendCustomIntegrationsQuery: () => mockUseGetAppendCustomIntegrationsQuery(),
  useGetReplacementCustomIntegrationsQuery: () => mockUseGetReplacementCustomIntegrationsQuery(),
  useGetPackageVerificationKeyId: () => mockUseGetPackageVerificationKeyId(),
}));

jest.mock('../../../../../hooks/use_merge_epr_with_replacements', () => ({
  useMergeEprPackagesWithReplacements: (epr: any, custom: any) =>
    mockUseMergeEprPackagesWithReplacements(epr, custom),
}));

jest.mock('./use_build_integrations_url', () => ({
  useBuildIntegrationsUrl: () => mockUseBuildIntegrationsUrl(),
}));

jest.mock('../../../../../services', () => ({
  doesPackageHaveIntegrations: (pkg: any) => {
    return pkg.policy_templates && pkg.policy_templates.length > 0;
  },
}));

jest.mock('../../../../../../../../common/services', () => ({
  isInputOnlyPolicyTemplate: (template: any) => template.type === 'input',
  isIntegrationPolicyTemplate: (template: any) => template.type === 'integration',
  filterPolicyTemplatesTiles: (_behavior: any, topPackage: any, integrations: any[]) => {
    if (integrations.length > 0) {
      return integrations;
    }
    return [topPackage];
  },
}));

jest.mock('../../../../../../../../common/services/agentless_policy_helper', () => ({
  isOnlyAgentlessPolicyTemplate: (template: any) =>
    template.deployment_modes?.agentless?.enabled === true &&
    template.deployment_modes?.default?.enabled !== true,
  isOnlyAgentlessIntegration: (pkg: any) => {
    const templates = pkg.policy_templates || [];
    return (
      templates.length > 0 &&
      templates.every(
        (t: any) =>
          t.deployment_modes?.agentless?.enabled === true &&
          t.deployment_modes?.default?.enabled !== true
      )
    );
  },
  isAgentlessIntegration: (pkg: any, integration?: string) => {
    if (!integration) return false;
    const template = pkg.policy_templates?.find((t: any) => t.name === integration);
    return template?.deployment_modes?.agentless?.enabled === true;
  },
}));

jest.mock('../category_facets', () => ({
  ALL_CATEGORY: { id: '', title: 'All', count: 0 },
}));

jest.mock('../util', () => ({
  mergeCategoriesAndCount: jest.fn((categories, cards) => categories),
}));

jest.mock('..', () => ({
  mapToCard: ({ item }: any) => ({
    id: item.id,
    title: item.title || item.name,
    description: item.description || '',
    categories: item.categories || [],
    url: `/detail/${item.name}`,
  }),
}));

// Import after mocks are set up
import { useAvailablePackages } from './use_available_packages';

describe('useAvailablePackages', () => {
  const mockPackageVerificationKeyId = 'test-key-id';
  const mockGetAbsolutePath = jest.fn((path: string) => path);
  const mockGetHref = jest.fn((path: string) => path);
  const mockAddBasePath = jest.fn((path: string) => path);
  const mockSetUrlandPushHistory = jest.fn();
  const mockSetUrlandReplaceHistory = jest.fn();

  const mockBasicPackage: PackageListItem = {
    id: 'nginx-1.0.0',
    name: 'nginx',
    title: 'Nginx',
    version: '1.0.0',
    description: 'Nginx integration',
    type: 'integration',
    release: 'ga',
    download: '/download',
    path: '/path',
    icons: [],
    categories: ['web'],
    policy_templates: [],
    status: undefined,
  };

  const mockPackageWithIntegrations: PackageListItem = {
    ...mockBasicPackage,
    id: 'apache-1.0.0',
    name: 'apache',
    title: 'Apache',
    policy_templates: [
      {
        name: 'logs',
        title: 'Apache Logs',
        description: 'Collect logs',
        categories: ['observability'],
        type: 'integration',
      },
      {
        name: 'metrics',
        title: 'Apache Metrics',
        description: 'Collect metrics',
        categories: ['observability'],
        type: 'integration',
      },
    ],
  };

  const mockCategories = [
    { id: 'web', title: 'Web', count: 0 },
    { id: 'observability', title: 'Observability', count: 0 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAgentless.mockReturnValue({ isAgentlessEnabled: false });
    mockUseGetPackageVerificationKeyId.mockReturnValue({
      packageVerificationKeyId: mockPackageVerificationKeyId,
    });

    mockUseGetPackagesQuery.mockReturnValue({
      data: { items: [mockBasicPackage] },
      isLoading: false,
      error: null,
    });

    mockUseGetCategoriesQuery.mockReturnValue({
      data: { items: mockCategories },
      isLoading: false,
      error: null,
    });

    mockUseGetAppendCustomIntegrationsQuery.mockReturnValue({
      data: [],
      isInitialLoading: false,
    });

    mockUseGetReplacementCustomIntegrationsQuery.mockReturnValue({
      data: [],
      isInitialLoading: false,
    });

    mockUseMergeEprPackagesWithReplacements.mockImplementation((epr, custom) => [
      ...epr,
      ...custom,
    ]);

    mockUseBuildIntegrationsUrl.mockReturnValue({
      initialSelectedCategory: '',
      initialSubcategory: undefined,
      initialOnlyAgentless: false,
      showDeprecated: undefined,
      setUrlandPushHistory: mockSetUrlandPushHistory,
      setUrlandReplaceHistory: mockSetUrlandReplaceHistory,
      getHref: mockGetHref,
      getAbsolutePath: mockGetAbsolutePath,
      searchParam: '',
      addBasePath: mockAddBasePath,
    });
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.selectedCategory).toBe('');
      expect(result.current.selectedSubCategory).toBeUndefined();
      expect(result.current.searchTerm).toBe('');
      expect(result.current.preference).toBe('agent');
      expect(result.current.onlyAgentlessFilter).toBe(false);
    });

    it('should initialize from URL parameters', () => {
      mockUseBuildIntegrationsUrl.mockReturnValue({
        initialSelectedCategory: 'web',
        initialSubcategory: 'nginx',
        initialOnlyAgentless: true,
        showDeprecated: false,
        setUrlandPushHistory: mockSetUrlandPushHistory,
        setUrlandReplaceHistory: mockSetUrlandReplaceHistory,
        getHref: mockGetHref,
        getAbsolutePath: mockGetAbsolutePath,
        searchParam: 'nginx',
        addBasePath: mockAddBasePath,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.selectedCategory).toBe('web');
      expect(result.current.selectedSubCategory).toBe('nginx');
      expect(result.current.searchTerm).toBe('nginx');
      expect(result.current.onlyAgentlessFilter).toBe(true);
    });
  });

  describe('package queries', () => {
    it('should query packages with prerelease when prereleaseIntegrationsEnabled is true', () => {
      renderHook(() => useAvailablePackages({ prereleaseIntegrationsEnabled: true }));

      expect(mockUseGetPackagesQuery).toHaveBeenCalledWith({ prerelease: true });
      expect(mockUseGetCategoriesQuery).toHaveBeenCalledWith({ prerelease: true });
    });

    it('should query packages without prerelease when prereleaseIntegrationsEnabled is false', () => {
      renderHook(() => useAvailablePackages({ prereleaseIntegrationsEnabled: false }));

      expect(mockUseGetPackagesQuery).toHaveBeenCalledWith({ prerelease: false });
      expect(mockUseGetCategoriesQuery).toHaveBeenCalledWith({ prerelease: false });
    });
  });

  describe('package list transformation', () => {
    it('should flatten packages with multiple integrations', () => {
      mockUseGetPackagesQuery.mockReturnValue({
        data: { items: [mockPackageWithIntegrations] },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      // Should create separate cards for each integration
      expect(result.current.filteredCards).toHaveLength(2);
      expect(result.current.filteredCards[0].title).toBe('Apache Logs');
      expect(result.current.filteredCards[1].title).toBe('Apache Metrics');
    });

    it('should handle packages without integrations', () => {
      mockUseGetPackagesQuery.mockReturnValue({
        data: { items: [mockBasicPackage] },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(1);
      expect(result.current.filteredCards[0].title).toBe('Nginx');
    });

    it('should remove Kubernetes package granularity', () => {
      const kubernetesPackage: PackageListItem = {
        ...mockBasicPackage,
        id: 'kubernetes',
        name: 'kubernetes',
        title: 'Kubernetes',
        policy_templates: [
          {
            name: 'logs',
            title: 'Kubernetes Logs',
            description: 'Collect logs',
            type: 'integration',
          },
        ],
      };

      mockUseGetPackagesQuery.mockReturnValue({
        data: { items: [kubernetesPackage] },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      // Should show kubernetes as a single package, not split into integrations
      expect(result.current.filteredCards).toHaveLength(1);
      expect(result.current.filteredCards[0].title).toBe('Kubernetes');
    });
  });

  describe('agentless filtering', () => {
    const agentlessPackage = {
      ...mockBasicPackage,
      id: 'agentless-pkg',
      name: 'agentless-pkg',
      supportsAgentless: true,
      policy_templates: [
        {
          name: 'default',
          title: 'Default',
          description: 'Default template',
          type: 'integration',
          deployment_modes: {
            agentless: { enabled: true },
            default: { enabled: true },
          },
        },
      ],
    } as PackageListItem & { supportsAgentless: boolean };

    it('should not filter packages when agentless is disabled', () => {
      mockUseAgentless.mockReturnValue({ isAgentlessEnabled: false });
      mockUseGetPackagesQuery.mockReturnValue({
        data: { items: [mockBasicPackage, agentlessPackage] },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(2);
    });

    it('should filter to only agentless packages when agentless filter is enabled', () => {
      mockUseAgentless.mockReturnValue({ isAgentlessEnabled: true });
      mockUseBuildIntegrationsUrl.mockReturnValue({
        ...mockUseBuildIntegrationsUrl(),
        initialOnlyAgentless: true,
      });
      mockUseGetPackagesQuery.mockReturnValue({
        data: { items: [mockBasicPackage, agentlessPackage] },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(1);
      // The package gets flattened into its policy templates, so check for the template title
      expect(result.current.filteredCards[0].title).toBe('Default');
    });
  });

  describe('category filtering', () => {
    beforeEach(() => {
      mockUseGetPackagesQuery.mockReturnValue({
        data: {
          items: [
            { ...mockBasicPackage, categories: ['web'] },
            { ...mockBasicPackage, id: 'pkg2', name: 'pkg2', categories: ['observability'] },
          ],
        },
        isLoading: false,
        error: null,
      });
    });

    it('should show all packages when no category is selected', () => {
      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(2);
    });

    it('should filter by selected category', () => {
      mockUseBuildIntegrationsUrl.mockReturnValue({
        ...mockUseBuildIntegrationsUrl(),
        initialSelectedCategory: 'web',
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(1);
      expect(result.current.filteredCards[0].categories).toContain('web');
    });

    it('should filter by subcategory when selected', () => {
      mockUseBuildIntegrationsUrl.mockReturnValue({
        ...mockUseBuildIntegrationsUrl(),
        initialSelectedCategory: 'web',
        initialSubcategory: 'nginx',
      });
      mockUseGetPackagesQuery.mockReturnValue({
        data: {
          items: [
            { ...mockBasicPackage, categories: ['web', 'nginx'] },
            { ...mockBasicPackage, id: 'pkg2', name: 'pkg2', categories: ['web', 'apache'] },
          ],
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.filteredCards).toHaveLength(1);
      expect(result.current.filteredCards[0].categories).toContain('nginx');
    });
  });

  describe('categories', () => {
    it('should include ALL_CATEGORY with correct count', () => {
      mockUseGetPackagesQuery.mockReturnValue({
        data: { items: [mockBasicPackage, { ...mockBasicPackage, id: 'pkg2' }] },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      const allCategory = result.current.allCategories.find((c) => c.id === '');
      expect(allCategory).toBeDefined();
      expect(allCategory?.count).toBe(2);
    });

    it('should filter out subcategories from main categories', () => {
      mockUseGetCategoriesQuery.mockReturnValue({
        data: {
          items: [
            { id: 'web', title: 'Web', count: 0 },
            { id: 'nginx', title: 'Nginx', count: 0, parent_id: 'web' },
          ],
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      const mainCategoryIds = result.current.mainCategories.map((c) => c.id);
      expect(mainCategoryIds).toContain('web');
      expect(mainCategoryIds).not.toContain('nginx');
    });

    it('should show available subcategories for selected category', () => {
      mockUseBuildIntegrationsUrl.mockReturnValue({
        ...mockUseBuildIntegrationsUrl(),
        initialSelectedCategory: 'web',
      });
      mockUseGetCategoriesQuery.mockReturnValue({
        data: {
          items: [
            { id: 'web', title: 'Web', count: 0 },
            { id: 'nginx', title: 'Nginx', count: 0, parent_id: 'web' },
            { id: 'apache', title: 'Apache', count: 0, parent_id: 'web' },
            { id: 'other', title: 'Other', count: 0, parent_id: 'observability' },
          ],
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      const subCategoryIds = result.current.availableSubCategories.map((c) => c.id);
      expect(subCategoryIds).toContain('nginx');
      expect(subCategoryIds).toContain('apache');
      expect(subCategoryIds).not.toContain('other');
    });
  });

  describe('loading states', () => {
    it('should return isLoading true when any query is loading', () => {
      mockUseGetPackagesQuery.mockReturnValue({
        data: { items: [] },
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isLoadingAllPackages).toBe(true);
    });

    it('should return isLoading false when all queries are loaded', () => {
      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoadingAllPackages).toBe(false);
      expect(result.current.isLoadingCategories).toBe(false);
    });

    it('should expose individual loading states', () => {
      mockUseGetCategoriesQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.isLoadingCategories).toBe(true);
      expect(result.current.isLoadingAllPackages).toBe(false);
    });
  });

  describe('preference switching', () => {
    it('should use beats preference to show only custom integrations', () => {
      const customIntegration = {
        id: 'custom-1',
        title: 'Custom Integration',
        description: 'Custom',
        categories: ['custom'],
        shipper: 'beats',
      };

      mockUseGetReplacementCustomIntegrationsQuery.mockReturnValue({
        data: [customIntegration],
        isInitialLoading: false,
      });

      mockUseMergeEprPackagesWithReplacements.mockImplementation((epr, custom) => {
        return [...epr, ...custom];
      });

      mockUseBuildIntegrationsUrl.mockReturnValue({
        ...mockUseBuildIntegrationsUrl(),
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      // Default preference is 'agent', so should show EPR packages
      expect(result.current.preference).toBe('agent');
      expect(mockUseMergeEprPackagesWithReplacements).toHaveBeenCalledWith(expect.any(Array), []);
    });
  });

  describe('error handling', () => {
    it('should expose package loading errors', () => {
      const error = new Error('Failed to load packages');
      mockUseGetPackagesQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.eprPackageLoadingError).toBe(error);
    });

    it('should expose category loading errors', () => {
      const error = new Error('Failed to load categories');
      mockUseGetCategoriesQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      expect(result.current.eprCategoryLoadingError).toBe(error);
    });
  });

  describe('sorting', () => {
    it('should sort cards alphabetically by title', () => {
      mockUseGetPackagesQuery.mockReturnValue({
        data: {
          items: [
            { ...mockBasicPackage, id: 'zebra', name: 'zebra', title: 'Zebra' },
            { ...mockBasicPackage, id: 'alpha', name: 'alpha', title: 'Alpha' },
            { ...mockBasicPackage, id: 'beta', name: 'beta', title: 'Beta' },
          ],
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useAvailablePackages({ prereleaseIntegrationsEnabled: false })
      );

      const titles = result.current.filteredCards.map((c) => c.title);
      expect(titles).toEqual(['Alpha', 'Beta', 'Zebra']);
    });
  });
});
