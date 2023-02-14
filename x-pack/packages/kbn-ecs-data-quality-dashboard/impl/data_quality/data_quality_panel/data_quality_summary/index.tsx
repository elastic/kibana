/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { CheckStatus } from './check_status';
import { StatsRollup } from '../pattern/pattern_summary/stats_rollup';
import { SummaryActions } from './summary_actions';
import type { IndexToCheck, OnCheckCompleted, PatternRollup } from '../../types';
import { getErrorSummaries } from '../../helpers';

const MAX_SUMMARY_ACTIONS_CONTAINER_WIDTH = 400;
const MIN_SUMMARY_ACTIONS_CONTAINER_WIDTH = 235;

const SummaryActionsContainerFlexItem = styled(EuiFlexItem)`
  max-width: ${MAX_SUMMARY_ACTIONS_CONTAINER_WIDTH}px;
  min-width: ${MIN_SUMMARY_ACTIONS_CONTAINER_WIDTH}px;
  padding-right: ${({ theme }) => theme.eui.euiSizeXL};
`;

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  defaultNumberFormat: string;
  ilmPhases: string[];
  lastChecked: string;
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
  onCheckCompleted: OnCheckCompleted;
}

const DataQualitySummaryComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  defaultNumberFormat,
  ilmPhases,
  lastChecked,
  openCreateCaseFlyout,
  patternIndexNames,
  patternRollups,
  patterns,
  setLastChecked,
  totalDocsCount,
  totalIncompatible,
  totalIndices,
  totalIndicesChecked,
  onCheckCompleted,
}) => {
  const [indexToCheck, setIndexToCheck] = useState<IndexToCheck | null>(null);

  const [checkAllIndiciesChecked, setCheckAllIndiciesChecked] = useState<number>(0);
  const [checkAllTotalIndiciesToCheck, setCheckAllTotalIndiciesToCheck] = useState<number>(0);

  const incrementCheckAllIndiciesChecked = useCallback(() => {
    setCheckAllIndiciesChecked((current) => current + 1);
  }, []);

  const errorSummary = useMemo(() => getErrorSummaries(patternRollups), [patternRollups]);

  return (
    <EuiPanel hasShadow={true}>
      <EuiFlexGroup alignItems="flexStart" gutterSize="none" justifyContent="spaceBetween">
        <SummaryActionsContainerFlexItem grow={false}>
          <SummaryActions
            addSuccessToast={addSuccessToast}
            canUserCreateAndReadCases={canUserCreateAndReadCases}
            defaultNumberFormat={defaultNumberFormat}
            errorSummary={errorSummary}
            ilmPhases={ilmPhases}
            incrementCheckAllIndiciesChecked={incrementCheckAllIndiciesChecked}
            onCheckCompleted={onCheckCompleted}
            openCreateCaseFlyout={openCreateCaseFlyout}
            patternIndexNames={patternIndexNames}
            patterns={patterns}
            patternRollups={patternRollups}
            setCheckAllIndiciesChecked={setCheckAllIndiciesChecked}
            setCheckAllTotalIndiciesToCheck={setCheckAllTotalIndiciesToCheck}
            setIndexToCheck={setIndexToCheck}
            totalDocsCount={totalDocsCount}
            totalIncompatible={totalIncompatible}
            totalIndices={totalIndices}
            totalIndicesChecked={totalIndicesChecked}
          />

          <EuiSpacer size="s" />

          <CheckStatus
            addSuccessToast={addSuccessToast}
            checkAllIndiciesChecked={checkAllIndiciesChecked}
            checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
            errorSummary={errorSummary}
            indexToCheck={indexToCheck}
            lastChecked={lastChecked}
            setLastChecked={setLastChecked}
          />
        </SummaryActionsContainerFlexItem>

        <EuiFlexItem grow={false}>
          <StatsRollup
            defaultNumberFormat={defaultNumberFormat}
            docsCount={totalDocsCount}
            incompatible={totalIncompatible}
            indices={totalIndices}
            indicesChecked={totalIndicesChecked}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const DataQualitySummary = React.memo(DataQualitySummaryComponent);
