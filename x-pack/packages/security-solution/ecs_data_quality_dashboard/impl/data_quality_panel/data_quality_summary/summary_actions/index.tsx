/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { sortBy } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { CheckAll } from './check_all';
import { CheckStatus } from './check_status';
import type { DataQualityCheckResult, IndexToCheck, PatternRollup } from '../../types';
import { useDataQualityContext } from '../../data_quality_context';
import { useResultsRollupContext } from '../../contexts/results_rollup_context';
import { Actions } from '../../actions';
import { getErrorSummaries } from './utils/get_error_summaries';
import { getSizeInBytes } from '../../utils/stats';
import { getSummaryTableItems } from '../../utils/get_summary_table_items';
import { defaultSort } from '../../constants';
import {
  getDataQualitySummaryMarkdownComment,
  getErrorsMarkdownTable,
  getErrorsMarkdownTableRows,
  getPatternSummaryMarkdownComment,
} from './utils/markdown';
import { getSummaryTableMarkdownHeader, getSummaryTableMarkdownRow } from '../../utils/markdown';
import { ERROR, ERRORS, PATTERN } from './translations';
import { INDEX } from '../../translations';

const StyledActionsContainerFlexItem = styled(EuiFlexItem)`
  margin-top: auto;
  padding-bottom: 3px;
`;

export const getResultsSortedByDocsCount = (
  results: Record<string, DataQualityCheckResult> | undefined
): DataQualityCheckResult[] =>
  results != null ? sortBy('docsCount', Object.values(results)).reverse() : [];

export const getAllMarkdownCommentsFromResults = ({
  formatBytes,
  formatNumber,
  isILMAvailable,
  patternIndexNames,
  patternRollup,
}: {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  isILMAvailable: boolean;
  patternIndexNames: Record<string, string[]>;
  patternRollup: PatternRollup;
}): string[] => {
  const results = patternRollup.results;
  const sortedResults = getResultsSortedByDocsCount(results);

  const summaryTableItems = getSummaryTableItems({
    ilmExplain: patternRollup.ilmExplain,
    indexNames: patternIndexNames[patternRollup.pattern] ?? [],
    isILMAvailable,
    pattern: patternRollup.pattern,
    patternDocsCount: patternRollup.docsCount ?? 0,
    results: patternRollup.results,
    sortByColumn: defaultSort.sort.field,
    sortByDirection: defaultSort.sort.direction,
    stats: patternRollup.stats,
  });

  const summaryTableMarkdownRows: string[] = summaryTableItems.map((item) => {
    const result: DataQualityCheckResult | undefined =
      patternRollup.results != null ? patternRollup.results[item.indexName] : undefined;
    const sizeInBytes = getSizeInBytes({ indexName: item.indexName, stats: patternRollup.stats });

    return getSummaryTableMarkdownRow({
      docsCount: item.docsCount,
      formatBytes,
      formatNumber,
      ilmPhase: item.ilmPhase,
      indexName: item.indexName,
      incompatible: result?.incompatible,
      isILMAvailable,
      patternDocsCount: patternRollup.docsCount ?? 0,
      sizeInBytes,
    }).trim();
  });

  const initialComments: string[] =
    summaryTableMarkdownRows.length > 0
      ? [getSummaryTableMarkdownHeader(isILMAvailable), ...summaryTableMarkdownRows]
      : [];

  return sortedResults.reduce<string[]>(
    (acc, result) => [...acc, ...result.markdownComments],
    initialComments
  );
};

export const getAllMarkdownComments = ({
  formatBytes,
  formatNumber,
  isILMAvailable,
  patternIndexNames,
  patternRollups,
}: {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  isILMAvailable: boolean;
  patternIndexNames: Record<string, string[]>;
  patternRollups: Record<string, PatternRollup>;
}): string[] => {
  const allPatterns: string[] = Object.keys(patternRollups);

  // sort the patterns A-Z:
  const sortedPatterns = [...allPatterns].sort((a, b) => {
    return a.localeCompare(b);
  });

  return sortedPatterns.reduce<string[]>(
    (acc, pattern) => [
      ...acc,
      getPatternSummaryMarkdownComment({
        formatBytes,
        formatNumber,
        patternRollup: patternRollups[pattern],
      }),
      ...getAllMarkdownCommentsFromResults({
        formatBytes,
        formatNumber,
        isILMAvailable,
        patternRollup: patternRollups[pattern],
        patternIndexNames,
      }),
    ],
    []
  );
};

const SummaryActionsComponent: React.FC = () => {
  const { isILMAvailable, formatBytes, formatNumber } = useDataQualityContext();
  const {
    patternRollups,
    totalIndices,
    totalDocsCount,
    totalIndicesChecked,
    totalIncompatible,
    patternIndexNames,
    totalSizeInBytes,
  } = useResultsRollupContext();
  const errorSummary = useMemo(() => getErrorSummaries(patternRollups), [patternRollups]);
  const [indexToCheck, setIndexToCheck] = useState<IndexToCheck | null>(null);
  const [checkAllIndiciesChecked, setCheckAllIndiciesChecked] = useState<number>(0);
  const [checkAllTotalIndiciesToCheck, setCheckAllTotalIndiciesToCheck] = useState<number>(0);
  const incrementCheckAllIndiciesChecked = useCallback(() => {
    setCheckAllIndiciesChecked((current) => current + 1);
  }, []);

  const markdownComment = useMemo(
    () =>
      [
        getDataQualitySummaryMarkdownComment({
          formatBytes,
          formatNumber,
          totalDocsCount,
          totalIncompatible,
          totalIndices,
          totalIndicesChecked,
          sizeInBytes: totalSizeInBytes,
        }),
        ...getAllMarkdownComments({
          formatBytes,
          formatNumber,
          isILMAvailable,
          patternIndexNames,
          patternRollups,
        }),
        getErrorsMarkdownTable({
          errorSummary,
          getMarkdownTableRows: getErrorsMarkdownTableRows,
          headerNames: [PATTERN, INDEX, ERROR],
          title: ERRORS,
        }),
      ].join('\n'),
    [
      errorSummary,
      formatBytes,
      formatNumber,
      isILMAvailable,
      patternIndexNames,
      patternRollups,
      totalDocsCount,
      totalIncompatible,
      totalIndices,
      totalIndicesChecked,
      totalSizeInBytes,
    ]
  );

  return (
    <>
      <EuiFlexGroup data-test-subj="summaryActions" direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <CheckAll
            incrementCheckAllIndiciesChecked={incrementCheckAllIndiciesChecked}
            setCheckAllIndiciesChecked={setCheckAllIndiciesChecked}
            setCheckAllTotalIndiciesToCheck={setCheckAllTotalIndiciesToCheck}
            setIndexToCheck={setIndexToCheck}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <CheckStatus
            checkAllIndiciesChecked={checkAllIndiciesChecked}
            checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
            errorSummary={errorSummary}
            indexToCheck={indexToCheck}
          />
        </EuiFlexItem>

        <StyledActionsContainerFlexItem grow={false}>
          <Actions
            showAddToNewCaseAction={true}
            showCopyToClipboardAction={true}
            markdownComment={markdownComment}
          />
        </StyledActionsContainerFlexItem>
      </EuiFlexGroup>
    </>
  );
};

SummaryActionsComponent.displayName = 'SummaryActionsComponent';

export const SummaryActions = React.memo(SummaryActionsComponent);
