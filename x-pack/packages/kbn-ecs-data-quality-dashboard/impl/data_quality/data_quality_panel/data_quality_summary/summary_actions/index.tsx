/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { sortBy } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { CheckAll } from './check_all';
import { ERROR, INDEX, PATTERN } from '../errors_viewer/translations';
import { ERRORS } from '../errors_popover/translations';
import { EMPTY_STAT } from '../../../helpers';
import {
  getDataQualitySummaryMarkdownComment,
  getErrorsMarkdownTable,
  getErrorsMarkdownTableRows,
  getPatternSummaryMarkdownComment,
  getSummaryTableMarkdownHeader,
  getSummaryTableMarkdownRow,
} from '../../index_properties/markdown/helpers';
import { getSummaryTableItems } from '../../pattern/helpers';
import { TakeActionMenu } from './take_action_menu';
import type {
  DataQualityCheckResult,
  ErrorSummary,
  IndexToCheck,
  OnCheckCompleted,
  PatternRollup,
} from '../../../types';

const SummaryActionsFlexGroup = styled(EuiFlexGroup)`
  gap: ${({ theme }) => theme.eui.euiSizeS};
`;

export const getResultsSortedByDocsCount = (
  results: Record<string, DataQualityCheckResult> | undefined
): DataQualityCheckResult[] =>
  results != null ? sortBy('docsCount', Object.values(results)).reverse() : [];

export const getAllMarkdownCommentsFromResults = ({
  formatNumber,
  patternIndexNames,
  patternRollup,
}: {
  formatNumber: (value: number | undefined) => string;
  patternIndexNames: Record<string, string[]>;
  patternRollup: PatternRollup;
}): string[] => {
  const results = patternRollup.results;
  const sortedResults = getResultsSortedByDocsCount(results);

  const summaryTableItems = getSummaryTableItems({
    ilmExplain: patternRollup.ilmExplain,
    indexNames: patternIndexNames[patternRollup.pattern] ?? [],
    pattern: patternRollup.pattern,
    patternDocsCount: patternRollup.docsCount ?? 0,
    results: patternRollup.results,
    stats: patternRollup.stats,
  });

  const summaryTableMarkdownRows: string[] = summaryTableItems.map((item) => {
    const result: DataQualityCheckResult | undefined =
      patternRollup.results != null ? patternRollup.results[item.indexName] : undefined;

    return getSummaryTableMarkdownRow({
      docsCount: item.docsCount,
      formatNumber,
      ilmPhase: item.ilmPhase,
      indexName: item.indexName,
      incompatible: result?.incompatible,
      patternDocsCount: patternRollup.docsCount ?? 0,
    }).trim();
  });

  const initialComments: string[] =
    summaryTableMarkdownRows.length > 0
      ? [getSummaryTableMarkdownHeader(), ...summaryTableMarkdownRows]
      : [];

  return sortedResults.reduce<string[]>(
    (acc, result) => [...acc, ...result.markdownComments],
    initialComments
  );
};

export const getAllMarkdownComments = ({
  formatNumber,
  patternIndexNames,
  patternRollups,
}: {
  formatNumber: (value: number | undefined) => string;
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
        formatNumber,
        patternRollup: patternRollups[pattern],
      }),
      ...getAllMarkdownCommentsFromResults({
        formatNumber,
        patternRollup: patternRollups[pattern],
        patternIndexNames,
      }),
    ],
    []
  );
};

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  defaultNumberFormat: string;
  errorSummary: ErrorSummary[];
  ilmPhases: string[];
  incrementCheckAllIndiciesChecked: () => void;
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
  setCheckAllIndiciesChecked: (checkAllIndiciesChecked: number) => void;
  setCheckAllTotalIndiciesToCheck: (checkAllTotalIndiciesToCheck: number) => void;
  setIndexToCheck: (indexToCheck: IndexToCheck | null) => void;
  totalDocsCount: number | undefined;
  totalIncompatible: number | undefined;
  totalIndices: number | undefined;
  totalIndicesChecked: number | undefined;
}

const SummaryActionsComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  defaultNumberFormat,
  errorSummary,
  ilmPhases,
  incrementCheckAllIndiciesChecked,
  onCheckCompleted,
  openCreateCaseFlyout,
  patternIndexNames,
  patternRollups,
  patterns,
  totalDocsCount,
  setCheckAllIndiciesChecked,
  setCheckAllTotalIndiciesToCheck,
  setIndexToCheck,
  totalIncompatible,
  totalIndices,
  totalIndicesChecked,
}) => {
  const formatNumber = useCallback(
    (value: number | undefined): string =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT,
    [defaultNumberFormat]
  );

  const getMarkdownComments = useCallback(
    (): string[] => [
      getDataQualitySummaryMarkdownComment({
        formatNumber,
        totalDocsCount,
        totalIncompatible,
        totalIndices,
        totalIndicesChecked,
      }),
      ...getAllMarkdownComments({
        formatNumber,
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
      formatNumber,
      patternIndexNames,
      patternRollups,
      totalDocsCount,
      totalIncompatible,
      totalIndices,
      totalIndicesChecked,
    ]
  );

  return (
    <SummaryActionsFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <CheckAll
          defaultNumberFormat={defaultNumberFormat}
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
        <TakeActionMenu
          addSuccessToast={addSuccessToast}
          canUserCreateAndReadCases={canUserCreateAndReadCases}
          getMarkdownComments={getMarkdownComments}
          openCreateCaseFlyout={openCreateCaseFlyout}
        />
      </EuiFlexItem>
    </SummaryActionsFlexGroup>
  );
};

SummaryActionsComponent.displayName = 'SummaryActionsComponent';

export const SummaryActions = React.memo(SummaryActionsComponent);
