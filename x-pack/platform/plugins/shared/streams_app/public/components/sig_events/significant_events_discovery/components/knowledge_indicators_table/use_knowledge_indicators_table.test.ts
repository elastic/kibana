/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import type { CriteriaWithPagination } from '@elastic/eui';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type { Feature } from '@kbn/streams-schema';
import {
  useKnowledgeIndicatorsTable,
  getKnowledgeIndicatorTitle,
} from './use_knowledge_indicators_table';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockToasts = {
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addError: jest.fn(),
};

let mockQuery: Record<string, unknown> = {};

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: { notifications: { toasts: mockToasts } },
  }),
}));

jest.mock('../../../../../hooks/use_streams_app_params', () => ({
  useStreamsAppParams: () => ({ query: mockQuery }),
}));

jest.mock('../../../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

let mockKnowledgeIndicators: KnowledgeIndicator[] = [];
let mockIsLoading = false;
const mockRefetch = jest.fn();

jest.mock('../../../../../hooks/sig_events/use_fetch_knowledge_indicators', () => ({
  useFetchKnowledgeIndicators: () => ({
    knowledgeIndicators: mockKnowledgeIndicators,
    occurrencesByQueryId: {},
    isLoading: mockIsLoading,
    isEmpty: !mockIsLoading && mockKnowledgeIndicators.length === 0,
    refetch: mockRefetch,
  }),
}));

const mockExcludeFeaturesInBulk = jest.fn();
const mockRestoreFeaturesInBulk = jest.fn();

jest.mock('../../../../../hooks/sig_events/use_discovery_features_api', () => ({
  useDiscoveryFeaturesApi: () => ({
    excludeFeaturesInBulk: mockExcludeFeaturesInBulk,
    restoreFeaturesInBulk: mockRestoreFeaturesInBulk,
  }),
}));

const mockPromote = jest.fn();

jest.mock('../../../../../hooks/sig_events/use_queries_api', () => ({
  useQueriesApi: () => ({
    promote: mockPromote,
  }),
}));

const mockInvalidatePromoteRelatedQueries = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../../hooks/sig_events/use_invalidate_promote_queries', () => ({
  useInvalidatePromoteRelatedQueries: () => mockInvalidatePromoteRelatedQueries,
}));

const mockDeleteKnowledgeIndicatorsInBulk = jest.fn();
let mockIsDeleting = false;

jest.mock('../../../../../hooks/sig_events/use_knowledge_indicators_bulk_delete', () => ({
  useKnowledgeIndicatorsBulkDelete: ({ onSuccess }: { onSuccess?: () => void }) => {
    mockBulkDeleteOnSuccess = onSuccess;
    return {
      deleteKnowledgeIndicatorsInBulk: mockDeleteKnowledgeIndicatorsInBulk,
      isDeleting: mockIsDeleting,
    };
  },
}));

let mockBulkDeleteOnSuccess: (() => void) | undefined;

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: (value: string) => value,
}));

let mockIsMutatingValue = 0;
const mockMutate = jest.fn();
let mockMutationCallbacks: { onSuccess?: () => Promise<void>; onError?: (e: Error) => void } = {};

jest.mock('@kbn/react-query', () => ({
  useIsMutating: () => mockIsMutatingValue,
  useMutation: (config: {
    mutationFn: (ids: string[]) => Promise<unknown>;
    onSuccess?: () => Promise<void>;
    onError?: (e: Error) => void;
  }) => {
    mockMutationCallbacks = { onSuccess: config.onSuccess, onError: config.onError };
    return {
      mutate: mockMutate,
      isLoading: false,
    };
  },
}));

function makeFeature(
  overrides: Partial<Feature> & { uuid: string; stream_name: string } & Record<string, unknown>
): Feature {
  return {
    type: 'entity',
    id: overrides.uuid,
    title: overrides.title ?? overrides.uuid,
    subtype: undefined,
    excluded_at: undefined,
    ...overrides,
  } as unknown as Feature;
}

function makeFeatureKI(
  overrides: Partial<Feature> & { uuid: string; stream_name: string } & Record<string, unknown>
): KnowledgeIndicator {
  return { kind: 'feature', feature: makeFeature(overrides) };
}

function makeQueryKI(opts: {
  id: string;
  title?: string;
  stream_name: string;
  backed?: boolean;
  type?: string;
}): KnowledgeIndicator {
  return {
    kind: 'query',
    query: {
      id: opts.id,
      title: opts.title ?? opts.id,
      type: opts.type ?? 'match',
    },
    rule: { backed: opts.backed ?? false, id: opts.id },
    stream_name: opts.stream_name,
  } as KnowledgeIndicator;
}

describe('getKnowledgeIndicatorTitle', () => {
  it('returns feature title when available', () => {
    const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1', title: 'My Feature' });
    expect(getKnowledgeIndicatorTitle(ki)).toBe('My Feature');
  });

  it('falls back to feature id when title is missing', () => {
    const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1', title: undefined });
    expect(getKnowledgeIndicatorTitle(ki)).toBe('f1');
  });

  it('returns query title when available', () => {
    const ki = makeQueryKI({ id: 'q1', title: 'My Query', stream_name: 's1' });
    expect(getKnowledgeIndicatorTitle(ki)).toBe('My Query');
  });

  it('falls back to query id when title is missing', () => {
    const ki = makeQueryKI({ id: 'q1', title: undefined, stream_name: 's1' });
    expect(getKnowledgeIndicatorTitle(ki)).toBe('q1');
  });
});

describe('useKnowledgeIndicatorsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = {};
    mockKnowledgeIndicators = [];
    mockIsLoading = false;
    mockIsDeleting = false;
    mockIsMutatingValue = 0;
  });

  describe('initial state from URL query params', () => {
    it('returns empty defaults when no query params', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());

      expect(result.current.tableSearchValue).toBe('');
      expect(result.current.statusFilter).toBe('active');
      expect(result.current.selectedTypes).toEqual([]);
      expect(result.current.selectedSubtypes).toEqual([]);
      expect(result.current.selectedStreams).toEqual([]);
      expect(result.current.hideComputedTypes).toBe(true);
      expect(result.current.pagination).toEqual({ pageIndex: 0, pageSize: 25 });
    });

    it('initializes search from query.search', () => {
      mockQuery = { search: 'hello' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.tableSearchValue).toBe('hello');
    });

    it('initializes status from query.status', () => {
      mockQuery = { status: 'excluded' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.statusFilter).toBe('excluded');
    });

    it('defaults status to active for unknown values', () => {
      mockQuery = { status: 'bogus' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.statusFilter).toBe('active');
    });

    it('initializes type as array from string', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity' })];
      mockQuery = { type: 'entity' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedTypes).toEqual(['entity']);
    });

    it('initializes type as array from array', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity' }),
        makeFeatureKI({ uuid: 'f2', stream_name: 's1', type: 'infrastructure' }),
      ];
      mockQuery = { type: ['entity', 'infrastructure'] };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedTypes).toEqual(['entity', 'infrastructure']);
    });

    it('initializes subtype from query', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 's1', subtype: 'sub1' })];
      mockQuery = { subtype: 'sub1' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedSubtypes).toEqual(['sub1']);
    });

    it('initializes stream from query', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1' }),
        makeFeatureKI({ uuid: 'f2', stream_name: 's2' }),
      ];
      mockQuery = { stream: ['s1', 's2'] };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedStreams).toEqual(['s1', 's2']);
    });

    it('initializes hideComputedTypes=false when showComputed is true', () => {
      mockQuery = { showComputed: 'true' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.hideComputedTypes).toBe(false);
    });
  });

  describe('selectedKnowledgeIndicator from flyout param', () => {
    it('returns null when no flyout param', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 's1' })];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedKnowledgeIndicator).toBeNull();
    });

    it('finds matching feature by uuid', () => {
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];
      mockQuery = { flyout: 'f1' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedKnowledgeIndicator).toBe(ki);
      expect(result.current.selectedKnowledgeIndicatorId).toBe('f1');
    });

    it('finds matching query by id', () => {
      const ki = makeQueryKI({ id: 'q1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];
      mockQuery = { flyout: 'q1' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedKnowledgeIndicator).toBe(ki);
    });

    it('returns null when flyout does not match any indicator', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 's1' })];
      mockQuery = { flyout: 'nonexistent' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedKnowledgeIndicator).toBeNull();
    });
  });

  describe('filteredKnowledgeIndicators', () => {
    it('filters by active status (excludes features with excluded_at)', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1' }),
        makeFeatureKI({ uuid: 'f2', stream_name: 's1', excluded_at: '2024-01-01' }),
      ];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.filteredKnowledgeIndicators).toHaveLength(1);
      expect(result.current.filteredKnowledgeIndicators[0].kind).toBe('feature');
      if (result.current.filteredKnowledgeIndicators[0].kind === 'feature') {
        expect(result.current.filteredKnowledgeIndicators[0].feature.uuid).toBe('f1');
      }
    });

    it('sorts alphabetically by title', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f2', stream_name: 's1', title: 'Zebra' }),
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', title: 'Alpha' }),
        makeQueryKI({ id: 'q1', stream_name: 's1', title: 'Middle' }),
      ];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      const titles = result.current.filteredKnowledgeIndicators.map(getKnowledgeIndicatorTitle);
      expect(titles).toEqual(['Alpha', 'Middle', 'Zebra']);
    });

    it('filters by search term (case-insensitive)', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', title: 'CPU Usage' }),
        makeFeatureKI({ uuid: 'f2', stream_name: 's1', title: 'Memory' }),
      ];
      mockQuery = { search: 'cpu' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.filteredKnowledgeIndicators).toHaveLength(1);
    });

    it('hides computed feature types by default', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity' }),
        makeFeatureKI({ uuid: 'f2', stream_name: 's1', type: 'dataset_analysis' }),
      ];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.filteredKnowledgeIndicators).toHaveLength(1);
    });

    it('shows computed types when showComputed is true', () => {
      mockQuery = { showComputed: 'true' };
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity' }),
        makeFeatureKI({ uuid: 'f2', stream_name: 's1', type: 'dataset_analysis' }),
      ];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.filteredKnowledgeIndicators).toHaveLength(2);
    });
  });

  describe('handler callbacks', () => {
    it('handleStatusFilterChange updates statusFilter and clears selection', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 's1' })];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        result.current.setSelectedKnowledgeIndicators(mockKnowledgeIndicators);
      });
      expect(result.current.selectedKnowledgeIndicators).toHaveLength(1);

      act(() => {
        result.current.handleStatusFilterChange('excluded');
      });
      expect(result.current.statusFilter).toBe('excluded');
      expect(result.current.selectedKnowledgeIndicators).toEqual([]);
      expect(result.current.pagination.pageIndex).toBe(0);
    });

    it('handleSelectedTypesChange updates types and clears subtypes', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity', subtype: 'sub1' }),
      ];
      mockQuery = { subtype: ['sub1'] };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedSubtypes).toEqual(['sub1']);

      act(() => {
        result.current.handleSelectedTypesChange(['entity']);
      });
      expect(result.current.selectedTypes).toEqual(['entity']);
      expect(result.current.selectedSubtypes).toEqual([]);
    });

    it('handleSelectedSubtypesChange updates subtypes', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.handleSelectedSubtypesChange(['sub1', 'sub2']);
      });
      expect(result.current.selectedSubtypes).toEqual(['sub1', 'sub2']);
    });

    it('handleSelectedStreamsChange updates streams', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 'logs' })];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.handleSelectedStreamsChange(['logs']);
      });
      expect(result.current.selectedStreams).toEqual(['logs']);
    });

    it('handleComputedToggleChange toggles computed types', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.hideComputedTypes).toBe(true);

      act(() => {
        result.current.handleComputedToggleChange(true);
      });
      expect(result.current.hideComputedTypes).toBe(false);

      act(() => {
        result.current.handleComputedToggleChange(false);
      });
      expect(result.current.hideComputedTypes).toBe(true);
    });

    it('handleComputedToggleChange removes computed types from selectedTypes when hiding', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity' }),
        makeFeatureKI({ uuid: 'f2', stream_name: 's1', type: 'dataset_analysis' }),
      ];
      mockQuery = { type: ['entity', 'dataset_analysis'], showComputed: 'true' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedTypes).toEqual(['entity', 'dataset_analysis']);

      act(() => {
        result.current.handleComputedToggleChange(false);
      });
      expect(result.current.hideComputedTypes).toBe(true);
      expect(result.current.selectedTypes).toEqual(['entity']);
    });

    it('handleSearchChange updates search value', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.handleSearchChange({
          target: { value: 'test' },
        } as React.ChangeEvent<HTMLInputElement>);
      });
      expect(result.current.tableSearchValue).toBe('test');
    });

    it('handleTableChange updates pagination', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.handleTableChange({
          page: { index: 2, size: 50 },
        } as CriteriaWithPagination<KnowledgeIndicator>);
      });
      expect(result.current.pagination).toEqual({ pageIndex: 2, pageSize: 50 });
    });

    it('handleTableChange does nothing when page is undefined', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.handleTableChange({} as CriteriaWithPagination<KnowledgeIndicator>);
      });
      expect(result.current.pagination).toEqual({ pageIndex: 0, pageSize: 25 });
    });
  });

  describe('URL sync effect', () => {
    it('calls router.replace with filter state', () => {
      mockKnowledgeIndicators = [];
      renderHook(() => useKnowledgeIndicatorsTable());

      expect(mockReplace).toHaveBeenCalledWith('/_discovery/{tab}', {
        path: { tab: 'knowledge_indicators' },
        query: {},
      });
    });

    it('includes all active filters in URL', () => {
      mockQuery = {
        search: 'test',
        status: 'excluded',
        type: ['entity'],
        subtype: ['sub1'],
        stream: ['logs'],
        showComputed: 'true',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      };

      renderHook(() => useKnowledgeIndicatorsTable());

      expect(mockReplace).toHaveBeenCalledWith('/_discovery/{tab}', {
        path: { tab: 'knowledge_indicators' },
        query: expect.objectContaining({
          search: 'test',
          status: 'excluded',
          type: ['entity'],
          subtype: ['sub1'],
          stream: ['logs'],
          showComputed: 'true',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        }),
      });
    });

    it('preserves flyout in URL', () => {
      mockQuery = { flyout: 'f1' };
      renderHook(() => useKnowledgeIndicatorsTable());
      expect(mockReplace).toHaveBeenCalledWith('/_discovery/{tab}', {
        path: { tab: 'knowledge_indicators' },
        query: expect.objectContaining({ flyout: 'f1' }),
      });
    });
  });

  describe('flyout navigation', () => {
    it('closeFlyout pushes without flyout param', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.closeFlyout();
      });
      expect(mockPush).toHaveBeenCalledWith('/_discovery/{tab}', {
        path: { tab: 'knowledge_indicators' },
        query: expect.not.objectContaining({ flyout: expect.anything() }),
      });
    });

    it('toggleSelectedKnowledgeIndicator opens flyout for new item', () => {
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        result.current.toggleSelectedKnowledgeIndicator(ki);
      });
      expect(mockPush).toHaveBeenCalledWith('/_discovery/{tab}', {
        path: { tab: 'knowledge_indicators' },
        query: expect.objectContaining({ flyout: 'f1' }),
      });
    });

    it('toggleSelectedKnowledgeIndicator closes flyout for already-open item', () => {
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];
      mockQuery = { flyout: 'f1' };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        result.current.toggleSelectedKnowledgeIndicator(ki);
      });
      expect(mockPush).toHaveBeenCalledWith('/_discovery/{tab}', {
        path: { tab: 'knowledge_indicators' },
        query: expect.not.objectContaining({ flyout: expect.anything() }),
      });
    });
  });

  describe('bulk exclude', () => {
    it('calls excludeFeaturesInBulk with features only, shows success', async () => {
      const feature = makeFeature({ uuid: 'f1', stream_name: 's1' });
      const ki = { kind: 'feature' as const, feature };
      mockKnowledgeIndicators = [ki];
      mockExcludeFeaturesInBulk.mockResolvedValue({ failedCount: 0 });

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });

      await act(async () => {
        await result.current.handleBulkExclude();
      });

      expect(mockExcludeFeaturesInBulk).toHaveBeenCalledWith([feature]);
      expect(mockToasts.addSuccess).toHaveBeenCalled();
      expect(result.current.selectedKnowledgeIndicators).toEqual([]);
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('shows warning when some features fail', async () => {
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];
      mockExcludeFeaturesInBulk.mockResolvedValue({ failedCount: 1 });

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });

      await act(async () => {
        await result.current.handleBulkExclude();
      });

      expect(mockToasts.addWarning).toHaveBeenCalled();
    });

    it('shows error toast when operation throws', async () => {
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];
      mockExcludeFeaturesInBulk.mockRejectedValue(new Error('network fail'));

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });

      await act(async () => {
        await result.current.handleBulkExclude();
      });

      expect(mockToasts.addError).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('wraps non-Error throwables', async () => {
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];
      mockExcludeFeaturesInBulk.mockRejectedValue('string error');

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });

      await act(async () => {
        await result.current.handleBulkExclude();
      });

      expect(mockToasts.addError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
    });

    it('skips when no features are selected (only queries)', async () => {
      const ki = makeQueryKI({ id: 'q1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });

      await act(async () => {
        await result.current.handleBulkExclude();
      });

      expect(mockExcludeFeaturesInBulk).not.toHaveBeenCalled();
    });
  });

  describe('bulk restore', () => {
    it('calls restoreFeaturesInBulk and shows success', async () => {
      const ki = makeFeatureKI({
        uuid: 'f1',
        stream_name: 's1',
        excluded_at: '2024-01-01',
      });
      mockKnowledgeIndicators = [ki];
      mockRestoreFeaturesInBulk.mockResolvedValue({ failedCount: 0 });

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });

      await act(async () => {
        await result.current.handleBulkRestore();
      });

      expect(mockRestoreFeaturesInBulk).toHaveBeenCalled();
      expect(mockToasts.addSuccess).toHaveBeenCalled();
    });
  });

  describe('bulk promote', () => {
    it('calls mutate with unbacked query ids', () => {
      const q1 = makeQueryKI({ id: 'q1', stream_name: 's1', backed: false });
      const q2 = makeQueryKI({ id: 'q2', stream_name: 's1', backed: true });
      mockKnowledgeIndicators = [q1, q2];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([q1, q2]);
      });

      act(() => {
        result.current.handleBulkPromote();
      });

      expect(mockMutate).toHaveBeenCalledWith(['q1']);
    });

    it('skips when no unbacked queries selected', () => {
      const q = makeQueryKI({ id: 'q1', stream_name: 's1', backed: true });
      mockKnowledgeIndicators = [q];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([q]);
      });

      act(() => {
        result.current.handleBulkPromote();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('promote onSuccess shows toast and invalidates queries', async () => {
      mockKnowledgeIndicators = [];
      renderHook(() => useKnowledgeIndicatorsTable());

      await act(async () => {
        await mockMutationCallbacks.onSuccess?.();
      });

      expect(mockToasts.addSuccess).toHaveBeenCalled();
      expect(mockInvalidatePromoteRelatedQueries).toHaveBeenCalled();
    });

    it('promote onError shows error toast', () => {
      renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        mockMutationCallbacks.onError?.(new Error('promote failed'));
      });

      expect(mockToasts.addError).toHaveBeenCalled();
    });
  });

  describe('bulk delete callback', () => {
    it('onSuccess clears selections and closes flyout', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 's1' })];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        result.current.setSelectedKnowledgeIndicators(mockKnowledgeIndicators);
        result.current.setKnowledgeIndicatorsToDelete(mockKnowledgeIndicators);
      });

      act(() => {
        mockBulkDeleteOnSuccess?.();
      });

      expect(result.current.selectedKnowledgeIndicators).toEqual([]);
      expect(result.current.knowledgeIndicatorsToDelete).toEqual([]);
      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe('selection pruning', () => {
    it('prunes selected indicators when they disappear from data', () => {
      const ki1 = makeFeatureKI({ uuid: 'f1', stream_name: 's1' });
      const ki2 = makeFeatureKI({ uuid: 'f2', stream_name: 's1' });
      mockKnowledgeIndicators = [ki1, ki2];

      const { result, rerender } = renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki1, ki2]);
      });
      expect(result.current.selectedKnowledgeIndicators).toHaveLength(2);

      mockKnowledgeIndicators = [ki1];
      rerender();

      waitFor(() => {
        expect(result.current.selectedKnowledgeIndicators).toHaveLength(1);
      });
    });
  });

  describe('selection computed properties', () => {
    it('selectionContainsNonExcludable is true when queries are selected', () => {
      const q = makeQueryKI({ id: 'q1', stream_name: 's1' });
      mockKnowledgeIndicators = [q];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([q]);
      });
      expect(result.current.selectionContainsNonExcludable).toBe(true);
    });

    it('selectionContainsNonExcludable is true when computed features are selected', () => {
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'dataset_analysis' });
      mockQuery = { showComputed: 'true' };
      mockKnowledgeIndicators = [ki];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });
      expect(result.current.selectionContainsNonExcludable).toBe(true);
    });

    it('selectionContainsNonExcludable is false for regular features', () => {
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity' });
      mockKnowledgeIndicators = [ki];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });
      expect(result.current.selectionContainsNonExcludable).toBe(false);
    });

    it('isSelectionActionsDisabled is true when nothing selected', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.isSelectionActionsDisabled).toBe(true);
    });

    it('isSelectionActionsDisabled is true when operation in progress', () => {
      mockIsDeleting = true;
      const ki = makeFeatureKI({ uuid: 'f1', stream_name: 's1' });
      mockKnowledgeIndicators = [ki];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });
      expect(result.current.isSelectionActionsDisabled).toBe(true);
    });

    it('hasPromotableSelected is true when unbacked queries selected', () => {
      const q = makeQueryKI({ id: 'q1', stream_name: 's1', backed: false });
      mockKnowledgeIndicators = [q];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([q]);
      });
      expect(result.current.hasPromotableSelected).toBe(true);
    });

    it('hasPromotableSelected is false when only backed queries selected', () => {
      const q = makeQueryKI({ id: 'q1', stream_name: 's1', backed: true });
      mockKnowledgeIndicators = [q];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([q]);
      });
      expect(result.current.hasPromotableSelected).toBe(false);
    });
  });

  describe('isOperationInProgress', () => {
    it('is true when deleting', () => {
      mockIsDeleting = true;
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.isOperationInProgress).toBe(true);
    });

    it('is true when row action is in progress', () => {
      mockIsMutatingValue = 1;
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.isOperationInProgress).toBe(true);
    });

    it('is false when nothing is in progress', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.isOperationInProgress).toBe(false);
    });
  });

  describe('hasOnlyHiddenComputedFeatures', () => {
    it('returns false when hideComputedTypes is false', () => {
      mockQuery = { showComputed: 'true' };
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'dataset_analysis' }),
      ];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.hasOnlyHiddenComputedFeatures).toBe(false);
    });

    it('returns false when there are no indicators', () => {
      mockKnowledgeIndicators = [];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.hasOnlyHiddenComputedFeatures).toBe(false);
    });

    it('returns false when there are visible filtered results', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity' })];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.hasOnlyHiddenComputedFeatures).toBe(false);
    });

    it('returns true when all matching indicators are hidden computed features', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'dataset_analysis' }),
      ];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.filteredKnowledgeIndicators).toHaveLength(0);
      expect(result.current.hasOnlyHiddenComputedFeatures).toBe(true);
    });
  });

  describe('filter pruning effect', () => {
    it('does not prune while loading', () => {
      mockIsLoading = true;
      mockQuery = { type: ['nonexistent'] };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.selectedTypes).toEqual(['nonexistent']);
    });

    it('prunes type filters that no longer match any indicator', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 's1', type: 'entity' })];
      mockQuery = { type: ['entity', 'nonexistent'] };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      waitFor(() => {
        expect(result.current.selectedTypes).toEqual(['entity']);
      });
    });

    it('prunes stream filters that no longer match any indicator', () => {
      mockKnowledgeIndicators = [makeFeatureKI({ uuid: 'f1', stream_name: 'logs' })];
      mockQuery = { stream: ['logs', 'metrics'] };
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      waitFor(() => {
        expect(result.current.selectedStreams).toEqual(['logs']);
      });
    });
  });

  describe('resetPagination', () => {
    it('resets page to 0 when changing filters', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        result.current.handleTableChange({
          page: { index: 3, size: 25 },
        } as CriteriaWithPagination<KnowledgeIndicator>);
      });
      expect(result.current.pagination.pageIndex).toBe(3);

      act(() => {
        result.current.handleStatusFilterChange('excluded');
      });
      expect(result.current.pagination.pageIndex).toBe(0);
    });
  });
});
