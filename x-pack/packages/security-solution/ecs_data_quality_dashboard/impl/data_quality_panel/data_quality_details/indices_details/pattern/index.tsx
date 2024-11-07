/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ErrorEmptyPrompt } from './error_empty_prompt';
import { getTotalPatternIncompatible, getTotalPatternIndicesChecked } from '../../../utils/stats';
import { getIndexNames, getPatternDocsCount, getPatternSizeInBytes } from './utils/stats';
import { LoadingEmptyPrompt } from './loading_empty_prompt';
import { PatternSummary } from './pattern_summary';
import { RemoteClustersCallout } from './remote_clusters_callout';
import { SummaryTable } from './summary_table';
import { getSummaryTableColumns } from './summary_table/utils/columns';
import * as i18n from './translations';
import type { PatternRollup, SelectedIndex, SortConfig } from '../../../types';
import { useIlmExplain } from './hooks/use_ilm_explain';
import { useStats } from './hooks/use_stats';
import { useDataQualityContext } from '../../../data_quality_context';
import { PatternAccordion, PatternAccordionChildren } from './styles';
import { IndexCheckFlyout } from './index_check_flyout';
import { useResultsRollupContext } from '../../../contexts/results_rollup_context';
import { useIndicesCheckContext } from '../../../contexts/indices_check_context';
import { getSummaryTableItems } from '../../../utils/get_summary_table_items';
import { defaultSort } from '../../../constants';
import { HISTORY_TAB_ID, LATEST_CHECK_TAB_ID, MIN_PAGE_SIZE } from './constants';
import { getIlmExplainPhaseCounts } from './utils/ilm_explain';
import { shouldCreateIndexNames } from './utils/should_create_index_names';
import { shouldCreatePatternRollup } from './utils/should_create_pattern_rollup';
import { getPageIndex } from './utils/get_page_index';
import { useAbortControllerRef } from '../../../hooks/use_abort_controller_ref';
import { useHistoricalResults } from './hooks/use_historical_results';
import { HistoricalResultsContext } from './contexts/historical_results_context';
import { HistoricalResultsTour } from './historical_results_tour';

const EMPTY_INDEX_NAMES: string[] = [];

interface Props {
  indexNames: string[] | undefined;
  pattern: string;
  patternRollup: PatternRollup | undefined;
  chartSelectedIndex: SelectedIndex | null;
  setChartSelectedIndex: (selectedIndex: SelectedIndex | null) => void;
  isTourActive: boolean;
  isFirstOpenNonEmptyPattern: boolean;
  onAccordionToggle: (patternName: string, isOpen: boolean, isEmpty: boolean) => void;
  onDismissTour: () => void;
  openPatternsUpdatedAt?: number;
}

const PatternComponent: React.FC<Props> = ({
  indexNames,
  pattern,
  patternRollup,
  chartSelectedIndex,
  setChartSelectedIndex,
  isTourActive,
  isFirstOpenNonEmptyPattern,
  onAccordionToggle,
  onDismissTour,
  openPatternsUpdatedAt,
}) => {
  const { historicalResultsState, fetchHistoricalResults } = useHistoricalResults();
  const historicalResultsContextValue = useMemo(
    () => ({
      fetchHistoricalResults,
      historicalResultsState,
    }),
    [fetchHistoricalResults, historicalResultsState]
  );
  const { httpFetch, isILMAvailable, ilmPhases, startDate, endDate, formatBytes, formatNumber } =
    useDataQualityContext();
  const { checkIndex } = useIndicesCheckContext();
  const { updatePatternIndexNames, updatePatternRollup } = useResultsRollupContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sorting, setSorting] = useState<SortConfig>(defaultSort);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(MIN_PAGE_SIZE);
  const patternComponentAccordionId = useGeneratedHtmlId({ prefix: 'patternComponentAccordion' });
  const [expandedIndexName, setExpandedIndexName] = useState<string | null>(null);
  const [initialFlyoutTabId, setInitialFlyoutTabId] = useState<
    typeof LATEST_CHECK_TAB_ID | typeof HISTORY_TAB_ID
  >(LATEST_CHECK_TAB_ID);
  const flyoutCheckNowAndExpandAbortControllerRef = useAbortControllerRef();
  const flyoutViewCheckHistoryAbortControllerRef = useAbortControllerRef();
  const flyoutChartSelectedActionAbortControllerRef = useAbortControllerRef();

  const {
    error: statsError,
    loading: loadingStats,
    stats,
  } = useStats({ pattern, startDate, endDate });
  const { error: ilmExplainError, loading: loadingIlmExplain, ilmExplain } = useIlmExplain(pattern);

  const loading = useMemo(
    () => loadingStats || loadingIlmExplain,
    [loadingIlmExplain, loadingStats]
  );
  const error = useMemo(() => statsError ?? ilmExplainError, [ilmExplainError, statsError]);

  const ilmExplainPhaseCounts = useMemo(
    () => (isILMAvailable ? getIlmExplainPhaseCounts(ilmExplain) : undefined),
    [ilmExplain, isILMAvailable]
  );

  const isFlyoutVisible = expandedIndexName !== null;

  const items = useMemo(
    () =>
      getSummaryTableItems({
        ilmExplain,
        indexNames: indexNames ?? EMPTY_INDEX_NAMES,
        isILMAvailable,
        pattern,
        patternDocsCount: patternRollup?.docsCount ?? 0,
        results: patternRollup?.results,
        sortByColumn: sorting.sort.field,
        sortByDirection: sorting.sort.direction,
        stats,
      }),
    [
      ilmExplain,
      indexNames,
      isILMAvailable,
      pattern,
      patternRollup?.docsCount,
      patternRollup?.results,
      sorting.sort.direction,
      sorting.sort.field,
      stats,
    ]
  );

  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  const isAccordionOpenRef = useRef(isAccordionOpen);
  useEffect(() => {
    isAccordionOpenRef.current = isAccordionOpen;
  }, [isAccordionOpen]);

  useEffect(() => {
    // this use effect syncs isEmpty state with the parent component
    //
    // we do not add isAccordionOpen to the dependency array because
    // it is already handled by handleAccordionToggle
    // so we don't want to additionally trigger this useEffect when isAccordionOpen changes
    // because it's confusing and unnecessary
    // that's why we use ref here to keep separation of concerns
    onAccordionToggle(pattern, isAccordionOpenRef.current, items.length === 0);
  }, [items.length, onAccordionToggle, pattern]);

  const handleAccordionToggle = useCallback(
    (isOpen: boolean) => {
      const isEmpty = items.length === 0;
      setIsAccordionOpen(isOpen);
      onAccordionToggle(pattern, isOpen, isEmpty);
    },
    [items.length, onAccordionToggle, pattern]
  );

  const firstRow = items[0];

  const handleFlyoutClose = useCallback(() => {
    setExpandedIndexName(null);
  }, []);

  const handleFlyoutCheckNowAndExpandAction = useCallback(
    (indexName: string) => {
      checkIndex({
        abortController: flyoutCheckNowAndExpandAbortControllerRef.current,
        indexName,
        pattern,
        httpFetch,
        formatBytes,
        formatNumber,
      });
      setExpandedIndexName(indexName);
      setInitialFlyoutTabId(LATEST_CHECK_TAB_ID);
    },
    [
      checkIndex,
      flyoutCheckNowAndExpandAbortControllerRef,
      formatBytes,
      formatNumber,
      httpFetch,
      pattern,
    ]
  );

  const handleFlyoutViewCheckHistoryAction = useCallback(
    (indexName: string) => {
      if (isTourActive) {
        onDismissTour();
      }
      fetchHistoricalResults({
        abortController: flyoutViewCheckHistoryAbortControllerRef.current,
        indexName,
      });
      setExpandedIndexName(indexName);
      setInitialFlyoutTabId(HISTORY_TAB_ID);
    },
    [fetchHistoricalResults, flyoutViewCheckHistoryAbortControllerRef, isTourActive, onDismissTour]
  );

  const handleOpenFlyoutHistoryTab = useCallback(() => {
    const firstItemIndexName = firstRow?.indexName;
    if (firstItemIndexName) {
      handleFlyoutViewCheckHistoryAction(firstItemIndexName);
    }
  }, [firstRow?.indexName, handleFlyoutViewCheckHistoryAction]);

  useEffect(() => {
    const newIndexNames = getIndexNames({ stats, ilmExplain, ilmPhases, isILMAvailable });
    const newDocsCount = getPatternDocsCount({ indexNames: newIndexNames, stats });

    if (
      shouldCreateIndexNames({
        indexNames,
        ilmExplain,
        isILMAvailable,
        newIndexNames,
        stats,
      })
    ) {
      updatePatternIndexNames({
        indexNames: newIndexNames,
        pattern,
      });
    }

    if (
      shouldCreatePatternRollup({
        error,
        ilmExplain,
        isILMAvailable,
        newDocsCount,
        patternRollup,
        stats,
      })
    ) {
      updatePatternRollup({
        docsCount: newDocsCount,
        error,
        ilmExplain,
        ilmExplainPhaseCounts,
        indices: getIndexNames({ stats, ilmExplain, ilmPhases, isILMAvailable }).length,
        pattern,
        results: undefined,
        sizeInBytes: isILMAvailable
          ? getPatternSizeInBytes({
              indexNames: getIndexNames({ stats, ilmExplain, ilmPhases, isILMAvailable }),
              stats,
            }) ?? 0
          : undefined,
        stats,
      });
    }
  }, [
    error,
    ilmExplain,
    ilmExplainPhaseCounts,
    ilmPhases,
    indexNames,
    isILMAvailable,
    pattern,
    patternRollup,
    stats,
    updatePatternIndexNames,
    updatePatternRollup,
  ]);

  useEffect(() => {
    if (chartSelectedIndex?.pattern === pattern) {
      const selectedPageIndex = getPageIndex({
        indexName: chartSelectedIndex.indexName,
        items,
        pageSize,
      });

      if (selectedPageIndex != null) {
        setPageIndex(selectedPageIndex);
      }

      if (chartSelectedIndex.indexName !== expandedIndexName && !isFlyoutVisible) {
        checkIndex({
          abortController: flyoutChartSelectedActionAbortControllerRef.current,
          indexName: chartSelectedIndex.indexName,
          pattern: chartSelectedIndex.pattern,
          httpFetch,
          formatBytes,
          formatNumber,
        });
        setExpandedIndexName(chartSelectedIndex.indexName);
      }

      containerRef.current?.scrollIntoView();
      setChartSelectedIndex(null);
    }
  }, [
    items,
    pageSize,
    pattern,
    chartSelectedIndex,
    setChartSelectedIndex,
    expandedIndexName,
    isFlyoutVisible,
    checkIndex,
    httpFetch,
    formatBytes,
    formatNumber,
    flyoutChartSelectedActionAbortControllerRef,
  ]);

  return (
    <div data-test-subj={`${pattern}PatternPanel`}>
      <HistoricalResultsContext.Provider value={historicalResultsContextValue}>
        <PatternAccordion
          id={patternComponentAccordionId}
          forceState={isAccordionOpen ? 'open' : 'closed'}
          onToggle={handleAccordionToggle}
          buttonProps={{
            'data-test-subj': `patternAccordionButton-${pattern}`,
          }}
          buttonContent={
            <PatternSummary
              incompatible={getTotalPatternIncompatible(patternRollup?.results)}
              indices={indexNames?.length}
              indicesChecked={getTotalPatternIndicesChecked(patternRollup)}
              ilmExplainPhaseCounts={ilmExplainPhaseCounts}
              pattern={pattern}
              patternDocsCount={patternRollup?.docsCount ?? 0}
              patternSizeInBytes={patternRollup?.sizeInBytes}
            />
          }
        >
          <PatternAccordionChildren>
            {!loading && pattern.includes(':') && (
              <>
                <RemoteClustersCallout />
                <EuiSpacer size="s" />
              </>
            )}

            {!loading && error != null && (
              <>
                <ErrorEmptyPrompt title={i18n.ERROR_LOADING_METADATA_TITLE(pattern)} />
                <EuiSpacer size="m" />
              </>
            )}

            {loading && (
              <>
                <LoadingEmptyPrompt loading={i18n.LOADING_STATS} />
                <EuiSpacer size="m" />
              </>
            )}

            {!loading && error == null && (
              <div ref={containerRef}>
                <HistoricalResultsTour
                  // this is a hack to force popover anchor position recalculation
                  // when the first open non-empty pattern layout changes due to other
                  // patterns being opened/closed
                  // It's a bug on Eui side
                  //
                  // TODO: remove this hack when EUI popover is fixed
                  // https://github.com/elastic/eui/issues/5226
                  {...(isFirstOpenNonEmptyPattern && { key: openPatternsUpdatedAt })}
                  anchorSelectorValue={pattern}
                  onTryIt={handleOpenFlyoutHistoryTab}
                  isOpen={
                    isTourActive &&
                    !isFlyoutVisible &&
                    isFirstOpenNonEmptyPattern &&
                    isAccordionOpen
                  }
                  onDismissTour={onDismissTour}
                  // Only set zIndex when the tour is in list view (not in flyout)
                  //
                  // 1 less than the z-index of the left navigation
                  // 5 less than the z-index of the timeline
                  //
                  //
                  // TODO this hack should be removed when we properly set z-indexes
                  // in the timeline and left navigation
                  zIndex={998}
                />
                <SummaryTable
                  getTableColumns={getSummaryTableColumns}
                  items={items}
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  pattern={pattern}
                  setPageIndex={setPageIndex}
                  setPageSize={setPageSize}
                  setSorting={setSorting}
                  onCheckNowAction={handleFlyoutCheckNowAndExpandAction}
                  onViewHistoryAction={handleFlyoutViewCheckHistoryAction}
                  sorting={sorting}
                />
              </div>
            )}
          </PatternAccordionChildren>
        </PatternAccordion>
        {isFlyoutVisible ? (
          <IndexCheckFlyout
            pattern={pattern}
            indexName={expandedIndexName}
            initialSelectedTabId={initialFlyoutTabId}
            patternRollup={patternRollup}
            ilmExplain={ilmExplain}
            stats={stats}
            onClose={handleFlyoutClose}
            onDismissTour={onDismissTour}
            isTourActive={isTourActive}
          />
        ) : null}
      </HistoricalResultsContext.Provider>
    </div>
  );
};

PatternComponent.displayName = 'PatternComponent';

export const Pattern = React.memo(PatternComponent);
