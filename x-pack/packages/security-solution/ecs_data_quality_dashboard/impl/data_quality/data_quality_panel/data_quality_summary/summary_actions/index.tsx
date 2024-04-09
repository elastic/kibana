/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { sortBy } from 'lodash/fp';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';

import { CheckAll } from './check_all';
import { CheckStatus } from '../check_status';
import { ERROR, INDEX, PATTERN } from '../errors_viewer/translations';
import { ERRORS } from '../errors_popover/translations';
import {
  getDataQualitySummaryMarkdownComment,
  getErrorsMarkdownTable,
  getErrorsMarkdownTableRows,
  getPatternSummaryMarkdownComment,
  getSummaryTableMarkdownHeader,
  getSummaryTableMarkdownRow,
} from '../../index_properties/markdown/helpers';
import { defaultSort, getSummaryTableItems } from '../../pattern/helpers';
import { Actions } from './actions';
import type {
  DataQualityCheckResult,
  ErrorSummary,
  IndexToCheck,
  OnCheckCompleted,
  PatternRollup,
} from '../../../types';
import { getSizeInBytes } from '../../../helpers';
import { useDataQualityContext } from '../../data_quality_context';

const SummaryActionsFlexGroup = styled(EuiFlexGroup)`
  gap: ${({ theme }) => theme.eui.euiSizeS};
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

  let displayDocSize = false;

  const summaryTableMarkdownRows: string[] = summaryTableItems.map((item) => {
    const result: DataQualityCheckResult | undefined =
      patternRollup.results != null ? patternRollup.results[item.indexName] : undefined;
    const sizeInBytes = getSizeInBytes({ indexName: item.indexName, stats: patternRollup.stats });
    displayDocSize = Number.isInteger(sizeInBytes);

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
      ? [getSummaryTableMarkdownHeader(isILMAvailable, displayDocSize), ...summaryTableMarkdownRows]
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

export interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  errorSummary: ErrorSummary[];
  ilmPhases: string[];
  lastChecked: string;
  onCheckCompleted: OnCheckCompleted;
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
  patternIndexNames: Record<string, string[]>;
  patternRollups: Record<string, PatternRollup>;
  patterns: string[];
  setLastChecked: (lastChecked: string) => void;
  totalDocsCount: number | undefined;
  totalIncompatible: number | undefined;
  totalIndices: number | undefined;
  totalIndicesChecked: number | undefined;
  sizeInBytes: number | undefined;
}

const SummaryActionsComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  formatBytes,
  formatNumber,
  errorSummary,
  ilmPhases,
  lastChecked,
  onCheckCompleted,
  openCreateCaseFlyout,
  patternIndexNames,
  patternRollups,
  patterns,
  setLastChecked,
  totalDocsCount,
  totalIncompatible,
  totalIndices,
  totalIndicesChecked,
  sizeInBytes,
}) => {
  const { isILMAvailable } = useDataQualityContext();
  const [indexToCheck, setIndexToCheck] = useState<IndexToCheck | null>(null);
  const [checkAllIndiciesChecked, setCheckAllIndiciesChecked] = useState<number>(0);
  const [checkAllTotalIndiciesToCheck, setCheckAllTotalIndiciesToCheck] = useState<number>(0);
  const incrementCheckAllIndiciesChecked = useCallback(() => {
    setCheckAllIndiciesChecked((current) => current + 1);
  }, []);

  const getMarkdownComments = useCallback(
    (): string[] => [
      getDataQualitySummaryMarkdownComment({
        formatBytes,
        formatNumber,
        totalDocsCount,
        totalIncompatible,
        totalIndices,
        totalIndicesChecked,
        sizeInBytes,
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
    ],
    [
      errorSummary,
      formatBytes,
      formatNumber,
      isILMAvailable,
      patternIndexNames,
      patternRollups,
      sizeInBytes,
      totalDocsCount,
      totalIncompatible,
      totalIndices,
      totalIndicesChecked,
    ]
  );

  return (
    <>
      <SummaryActionsFlexGroup data-test-subj="summaryActions" direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <CheckAll
            formatBytes={formatBytes}
            formatNumber={formatNumber}
            ilmPhases={ilmPhases}
            incrementCheckAllIndiciesChecked={incrementCheckAllIndiciesChecked}
            onCheckCompleted={onCheckCompleted}
            patternIndexNames={patternIndexNames}
            patterns={patterns}
            setCheckAllIndiciesChecked={setCheckAllIndiciesChecked}
            setCheckAllTotalIndiciesToCheck={setCheckAllTotalIndiciesToCheck}
            setIndexToCheck={setIndexToCheck}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <CheckStatus
            addSuccessToast={addSuccessToast}
            checkAllIndiciesChecked={checkAllIndiciesChecked}
            checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
            errorSummary={errorSummary}
            indexToCheck={indexToCheck}
            lastChecked={lastChecked}
            setLastChecked={setLastChecked}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Actions
            addSuccessToast={addSuccessToast}
            canUserCreateAndReadCases={canUserCreateAndReadCases}
            getMarkdownComments={getMarkdownComments}
            ilmPhases={ilmPhases}
            openCreateCaseFlyout={openCreateCaseFlyout}
          />
        </EuiFlexItem>
      </SummaryActionsFlexGroup>
    </>
  );
};

SummaryActionsComponent.displayName = 'SummaryActionsComponent';

export const SummaryActions = React.memo(SummaryActionsComponent);
