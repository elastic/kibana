/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useIsMutating, useMutation } from '@kbn/react-query';
import { COMPUTED_FEATURE_TYPES, isComputedFeature } from '@kbn/streams-schema';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchKnowledgeIndicators } from '../../../../../hooks/sig_events/use_fetch_knowledge_indicators';
import { useDiscoveryFeaturesApi } from '../../../../../hooks/sig_events/use_discovery_features_api';
import { useKnowledgeIndicatorsBulkDelete } from '../../../../../hooks/sig_events/use_knowledge_indicators_bulk_delete';
import { useQueriesApi, type PromoteResult } from '../../../../../hooks/sig_events/use_queries_api';
import { useInvalidatePromoteRelatedQueries } from '../../../../../hooks/sig_events/use_invalidate_promote_queries';
import { useKibana } from '../../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../../util/errors';
import { KI_ROW_ACTION_MUTATION_KEY } from '../../../stream_detail_significant_events_view/knowledge_indicator_actions_cell';
import { getKnowledgeIndicatorItemId } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_item_id';
import { getKnowledgeIndicatorStreamName } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_stream_name';
import { matchesKnowledgeIndicatorFilters } from '../../../stream_detail_significant_events_view/utils/matches_knowledge_indicator_filters';
import { getKnowledgeIndicatorType } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_type';
import {
  BULK_EXCLUDE_SUCCESS_TOAST_TITLE,
  BULK_EXCLUDE_PARTIAL_TOAST_TITLE,
  BULK_EXCLUDE_ERROR_TOAST_TITLE,
  BULK_RESTORE_SUCCESS_TOAST_TITLE,
  BULK_RESTORE_PARTIAL_TOAST_TITLE,
  BULK_RESTORE_ERROR_TOAST_TITLE,
  BULK_PROMOTE_SUCCESS_TOAST_TITLE,
  BULK_PROMOTE_ERROR_TITLE,
} from './translations';

const SEARCH_DEBOUNCE_MS = 300;
const COMPUTED_FEATURE_TYPES_SET = new Set<string>(COMPUTED_FEATURE_TYPES);

export const getKnowledgeIndicatorTitle = (ki: KnowledgeIndicator): string =>
  ki.kind === 'feature' ? ki.feature.title ?? ki.feature.id : ki.query.title ?? ki.query.id;

export function useKnowledgeIndicatorsTable() {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  const { knowledgeIndicators, occurrencesByQueryId, isLoading, isEmpty, refetch } =
    useFetchKnowledgeIndicators();
  const { excludeFeaturesInBulk, restoreFeaturesInBulk } = useDiscoveryFeaturesApi();
  const { promote } = useQueriesApi();
  const invalidatePromoteRelatedQueries = useInvalidatePromoteRelatedQueries();

  const [tableSearchValue, setTableSearchValue] = useState('');
  const debouncedSearchTerm = useDebouncedValue(tableSearchValue, SEARCH_DEBOUNCE_MS)
    .trim()
    .toLowerCase();
  const [statusFilter, setStatusFilter] = useState<'active' | 'excluded'>('active');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [hideComputedTypes, setHideComputedTypes] = useState(true);

  const [selectedKnowledgeIndicator, setSelectedKnowledgeIndicator] =
    useState<KnowledgeIndicator | null>(null);
  const [selectedKnowledgeIndicators, setSelectedKnowledgeIndicators] = useState<
    KnowledgeIndicator[]
  >([]);
  const [knowledgeIndicatorsToDelete, setKnowledgeIndicatorsToDelete] = useState<
    KnowledgeIndicator[]
  >([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const { deleteKnowledgeIndicatorsInBulk, isDeleting } = useKnowledgeIndicatorsBulkDelete({
    onSuccess: () => {
      setSelectedKnowledgeIndicators([]);
      setKnowledgeIndicatorsToDelete([]);
      closeFlyout();
    },
  });

  const [isBulkOperationInProgress, setIsBulkOperationInProgress] = useState(false);
  const isRowActionInProgress = useIsMutating({ mutationKey: KI_ROW_ACTION_MUTATION_KEY }) > 0;

  const selectedKnowledgeIndicatorId = selectedKnowledgeIndicator
    ? getKnowledgeIndicatorItemId(selectedKnowledgeIndicator)
    : undefined;

  // Prune flyout and checkbox selections when items disappear from the data
  // (e.g. after deletion or external refetch). Only depends on the raw data
  // array — filter changes don't invalidate selections.
  useEffect(() => {
    const validIds = new Set(knowledgeIndicators.map(getKnowledgeIndicatorItemId));

    setSelectedKnowledgeIndicator((current) => {
      if (!current) return current;
      return validIds.has(getKnowledgeIndicatorItemId(current)) ? current : null;
    });

    setSelectedKnowledgeIndicators((current) => {
      const pruned = current.filter((ki) => validIds.has(getKnowledgeIndicatorItemId(ki)));
      return pruned.length === current.length ? current : pruned;
    });
  }, [knowledgeIndicators]);

  // Cross-filter pruning: when one filter changes, the other filters' selected
  // values may no longer have any matching KIs. For example, if the user selects
  // type "keyword" and stream "logs", then changes status to "excluded" where no
  // "keyword" KIs exist, the type filter should drop "keyword" automatically.
  // Each filter dimension is computed independently of its own current selection
  // but *with* the other filters applied.
  useEffect(() => {
    const availableTypes = new Set<string>();
    const availableStreams = new Set<string>();

    for (const ki of knowledgeIndicators) {
      if (
        matchesKnowledgeIndicatorFilters(ki, {
          statusFilter,
          selectedStreams,
          hideComputedTypes,
        })
      ) {
        availableTypes.add(getKnowledgeIndicatorType(ki));
      }
      if (
        matchesKnowledgeIndicatorFilters(ki, {
          statusFilter,
          selectedTypes,
          hideComputedTypes,
        })
      ) {
        availableStreams.add(getKnowledgeIndicatorStreamName(ki));
      }
    }

    setSelectedTypes((current) => {
      const pruned = current.filter((t) => availableTypes.has(t));
      return pruned.length === current.length ? current : pruned;
    });
    setSelectedStreams((current) => {
      const pruned = current.filter((s) => availableStreams.has(s));
      return pruned.length === current.length ? current : pruned;
    });
  }, [knowledgeIndicators, statusFilter, selectedTypes, selectedStreams, hideComputedTypes]);

  const filteredKnowledgeIndicators = useMemo(() => {
    const filtered = knowledgeIndicators.filter((ki) =>
      matchesKnowledgeIndicatorFilters(ki, {
        statusFilter,
        selectedTypes,
        selectedStreams,
        hideComputedTypes,
        searchTerm: debouncedSearchTerm,
      })
    );

    return filtered.sort((a, b) =>
      getKnowledgeIndicatorTitle(a)
        .toLowerCase()
        .localeCompare(getKnowledgeIndicatorTitle(b).toLowerCase())
    );
  }, [
    knowledgeIndicators,
    debouncedSearchTerm,
    statusFilter,
    selectedTypes,
    selectedStreams,
    hideComputedTypes,
  ]);

  const resetPagination = useCallback(() => {
    setPagination((current) => {
      if (current.pageIndex === 0) return current;
      return { ...current, pageIndex: 0 };
    });
  }, []);

  const handleStatusFilterChange = useCallback(
    (filter: 'active' | 'excluded') => {
      setStatusFilter(filter);
      setSelectedKnowledgeIndicators([]);
      resetPagination();
    },
    [resetPagination]
  );

  const handleSelectedTypesChange = useCallback(
    (types: string[]) => {
      setSelectedTypes(types);
      resetPagination();
    },
    [resetPagination]
  );

  const handleSelectedStreamsChange = useCallback(
    (streams: string[]) => {
      setSelectedStreams(streams);
      resetPagination();
    },
    [resetPagination]
  );

  const handleComputedToggleChange = useCallback(
    (checked: boolean) => {
      const shouldHide = !checked;
      setHideComputedTypes(shouldHide);
      if (shouldHide) {
        setSelectedTypes((current) =>
          current.filter((type) => !COMPUTED_FEATURE_TYPES_SET.has(type))
        );
      }
      resetPagination();
    },
    [resetPagination]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTableSearchValue(event.target.value);
      resetPagination();
    },
    [resetPagination]
  );

  const closeFlyout = useCallback(() => {
    setSelectedKnowledgeIndicator(null);
  }, []);

  const toggleSelectedKnowledgeIndicator = useCallback((ki: KnowledgeIndicator) => {
    setSelectedKnowledgeIndicator((current) => {
      if (!current) return ki;
      return getKnowledgeIndicatorItemId(current) === getKnowledgeIndicatorItemId(ki) ? null : ki;
    });
  }, []);

  const handleTableChange = useCallback(({ page }: CriteriaWithPagination<KnowledgeIndicator>) => {
    if (!page) return;
    setPagination({ pageIndex: page.index, pageSize: page.size });
  }, []);

  const executeBulkFeatureOperation = useCallback(
    async ({
      operation,
      successTitle,
      partialTitle,
      errorTitle,
    }: {
      operation: typeof excludeFeaturesInBulk;
      successTitle: string;
      partialTitle: string;
      errorTitle: string;
    }) => {
      const features = selectedKnowledgeIndicators
        .filter((ki) => ki.kind === 'feature')
        .map((ki) => ki.feature);

      if (features.length === 0) return;

      setIsBulkOperationInProgress(true);
      try {
        const { failedCount } = await operation(features);
        if (failedCount === 0) {
          toasts.addSuccess({ title: successTitle });
        } else {
          toasts.addWarning({ title: partialTitle });
        }
        setSelectedKnowledgeIndicators([]);
        closeFlyout();
      } catch (error) {
        toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: errorTitle,
        });
      } finally {
        setIsBulkOperationInProgress(false);
        refetch();
      }
    },
    [closeFlyout, selectedKnowledgeIndicators, toasts, refetch]
  );

  const handleBulkExclude = useCallback(
    () =>
      executeBulkFeatureOperation({
        operation: excludeFeaturesInBulk,
        successTitle: BULK_EXCLUDE_SUCCESS_TOAST_TITLE,
        partialTitle: BULK_EXCLUDE_PARTIAL_TOAST_TITLE,
        errorTitle: BULK_EXCLUDE_ERROR_TOAST_TITLE,
      }),
    [executeBulkFeatureOperation, excludeFeaturesInBulk]
  );

  const handleBulkRestore = useCallback(
    () =>
      executeBulkFeatureOperation({
        operation: restoreFeaturesInBulk,
        successTitle: BULK_RESTORE_SUCCESS_TOAST_TITLE,
        partialTitle: BULK_RESTORE_PARTIAL_TOAST_TITLE,
        errorTitle: BULK_RESTORE_ERROR_TOAST_TITLE,
      }),
    [executeBulkFeatureOperation, restoreFeaturesInBulk]
  );

  const bulkPromoteMutation = useMutation<PromoteResult, Error, string[]>({
    mutationFn: (queryIds) => promote({ queryIds }),
    onSuccess: async () => {
      toasts.addSuccess({ title: BULK_PROMOTE_SUCCESS_TOAST_TITLE });
      setSelectedKnowledgeIndicators([]);
      closeFlyout();
      await invalidatePromoteRelatedQueries();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: BULK_PROMOTE_ERROR_TITLE });
    },
  });

  const hasOnlyHiddenComputedFeatures = useMemo(() => {
    if (!hideComputedTypes || knowledgeIndicators.length === 0) return false;
    if (filteredKnowledgeIndicators.length > 0) return false;
    return knowledgeIndicators
      .filter((ki) =>
        matchesKnowledgeIndicatorFilters(ki, {
          statusFilter,
          selectedTypes,
          selectedStreams,
          hideComputedTypes: false,
          searchTerm: debouncedSearchTerm,
        })
      )
      .some((ki) => ki.kind === 'feature' && isComputedFeature(ki.feature));
  }, [
    hideComputedTypes,
    knowledgeIndicators,
    filteredKnowledgeIndicators,
    statusFilter,
    selectedTypes,
    selectedStreams,
    debouncedSearchTerm,
  ]);

  const handleBulkPromote = useCallback(() => {
    const queryIds = selectedKnowledgeIndicators.flatMap((ki) =>
      ki.kind === 'query' && !ki.rule.backed ? [ki.query.id] : []
    );
    if (queryIds.length === 0) return;
    bulkPromoteMutation.mutate(queryIds);
  }, [selectedKnowledgeIndicators, bulkPromoteMutation]);

  const isBulkPromoteInProgress = bulkPromoteMutation.isLoading;

  const isOperationInProgress =
    isDeleting || isBulkOperationInProgress || isBulkPromoteInProgress || isRowActionInProgress;

  const { selectionContainsNonExcludable, isSelectionActionsDisabled, hasPromotableSelected } =
    useMemo(() => {
      const containsQueries = selectedKnowledgeIndicators.some((ki) => ki.kind === 'query');
      const containsComputed = selectedKnowledgeIndicators.some(
        (ki) => ki.kind === 'feature' && isComputedFeature(ki.feature)
      );
      const hasUnbackedQueries = selectedKnowledgeIndicators.some(
        (ki) => ki.kind === 'query' && !ki.rule.backed
      );
      return {
        selectionContainsNonExcludable: containsQueries || containsComputed,
        isSelectionActionsDisabled:
          selectedKnowledgeIndicators.length === 0 || isOperationInProgress,
        hasPromotableSelected: hasUnbackedQueries,
      };
    }, [selectedKnowledgeIndicators, isOperationInProgress]);

  return {
    knowledgeIndicators,
    occurrencesByQueryId,
    isLoading,
    isEmpty,
    refetch,
    filteredKnowledgeIndicators,
    selectedKnowledgeIndicator,
    selectedKnowledgeIndicatorId,
    selectedKnowledgeIndicators,
    setSelectedKnowledgeIndicators,
    knowledgeIndicatorsToDelete,
    setKnowledgeIndicatorsToDelete,
    pagination,
    isDeleting,
    isBulkOperationInProgress,
    isBulkPromoteInProgress,
    isOperationInProgress,
    selectionContainsNonExcludable,
    hasPromotableSelected,
    isSelectionActionsDisabled,
    hasOnlyHiddenComputedFeatures,
    tableSearchValue,
    debouncedSearchTerm,
    statusFilter,
    selectedTypes,
    selectedStreams,
    hideComputedTypes,
    handleStatusFilterChange,
    handleSelectedTypesChange,
    handleSelectedStreamsChange,
    handleComputedToggleChange,
    handleSearchChange,
    handleTableChange,
    handleBulkExclude,
    handleBulkRestore,
    closeFlyout,
    toggleSelectedKnowledgeIndicator,
    deleteKnowledgeIndicatorsInBulk,
    handleBulkPromote,
  };
}
