/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { getErrorSummaries } from '../../helpers';
import { StatsRollup } from '../pattern/pattern_summary/stats_rollup';
import { SummaryActions } from './summary_actions';
import type { OnCheckCompleted, PatternRollup } from '../../types';

const MAX_SUMMARY_ACTIONS_CONTAINER_WIDTH = 400;
const MIN_SUMMARY_ACTIONS_CONTAINER_WIDTH = 235;

const SummaryActionsContainerFlexItem = styled(EuiFlexItem)`
  max-width: ${MAX_SUMMARY_ACTIONS_CONTAINER_WIDTH}px;
  min-width: ${MIN_SUMMARY_ACTIONS_CONTAINER_WIDTH}px;
  padding-right: ${({ theme }) => theme.eui.euiSizeXL};
`;

export interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
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
  totalSizeInBytes: number | undefined;
  onCheckCompleted: OnCheckCompleted;
}

const DataQualitySummaryComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  formatBytes,
  formatNumber,
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
  totalSizeInBytes,
  onCheckCompleted,
}) => {
  const errorSummary = useMemo(() => getErrorSummaries(patternRollups), [patternRollups]);

  return (
    <EuiPanel data-test-subj="dataQualitySummary" hasShadow={true}>
      <EuiFlexGroup alignItems="flexStart" gutterSize="none" justifyContent="spaceBetween">
        <SummaryActionsContainerFlexItem grow={false}>
          <SummaryActions
            addSuccessToast={addSuccessToast}
            canUserCreateAndReadCases={canUserCreateAndReadCases}
            formatBytes={formatBytes}
            formatNumber={formatNumber}
            errorSummary={errorSummary}
            ilmPhases={ilmPhases}
            lastChecked={lastChecked}
            onCheckCompleted={onCheckCompleted}
            openCreateCaseFlyout={openCreateCaseFlyout}
            patternIndexNames={patternIndexNames}
            patterns={patterns}
            patternRollups={patternRollups}
            setLastChecked={setLastChecked}
            sizeInBytes={totalSizeInBytes}
            totalDocsCount={totalDocsCount}
            totalIncompatible={totalIncompatible}
            totalIndices={totalIndices}
            totalIndicesChecked={totalIndicesChecked}
          />
        </SummaryActionsContainerFlexItem>

        <EuiFlexItem grow={false}>
          <StatsRollup
            docsCount={totalDocsCount}
            formatBytes={formatBytes}
            formatNumber={formatNumber}
            incompatible={totalIncompatible}
            indices={totalIndices}
            indicesChecked={totalIndicesChecked}
            sizeInBytes={totalSizeInBytes}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const DataQualitySummary = React.memo(DataQualitySummaryComponent);
