/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { DataQualityDetails } from './data_quality_details';
import { DataQualitySummary } from '../data_quality_summary';
import { useResultsRollup } from '../../use_results_rollup';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  getGroupByFieldsOnClick: (
    elements: Array<
      | FlameElementEvent
      | HeatmapElementEvent
      | MetricElementEvent
      | PartitionElementEvent
      | WordCloudElementEvent
      | XYChartElementEvent
    >
  ) => {
    groupByField0: string;
    groupByField1: string;
  };
  ilmPhases: string[];
  lastChecked: string;
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
  patterns: string[];
  setLastChecked: (lastChecked: string) => void;
  theme: Theme;
}

const BodyComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  formatBytes,
  formatNumber,
  getGroupByFieldsOnClick,
  ilmPhases,
  lastChecked,
  openCreateCaseFlyout,
  patterns,
  setLastChecked,
  theme,
}) => {
  const {
    onCheckCompleted,
    patternIndexNames,
    patternRollups,
    totalDocsCount,
    totalIncompatible,
    totalIndices,
    totalIndicesChecked,
    totalSizeInBytes,
    updatePatternIndexNames,
    updatePatternRollup,
  } = useResultsRollup({ ilmPhases, patterns });

  return (
    <EuiFlexGroup data-test-subj="body" direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DataQualitySummary
          addSuccessToast={addSuccessToast}
          canUserCreateAndReadCases={canUserCreateAndReadCases}
          formatBytes={formatBytes}
          formatNumber={formatNumber}
          ilmPhases={ilmPhases}
          lastChecked={lastChecked}
          openCreateCaseFlyout={openCreateCaseFlyout}
          patternIndexNames={patternIndexNames}
          patternRollups={patternRollups}
          patterns={patterns}
          setLastChecked={setLastChecked}
          totalDocsCount={totalDocsCount}
          totalIncompatible={totalIncompatible}
          totalIndices={totalIndices}
          totalIndicesChecked={totalIndicesChecked}
          totalSizeInBytes={totalSizeInBytes}
          onCheckCompleted={onCheckCompleted}
        />
        <EuiSpacer size="l" />
      </EuiFlexItem>

      <EuiFlexItem>
        <DataQualityDetails
          addSuccessToast={addSuccessToast}
          canUserCreateAndReadCases={canUserCreateAndReadCases}
          formatBytes={formatBytes}
          formatNumber={formatNumber}
          getGroupByFieldsOnClick={getGroupByFieldsOnClick}
          ilmPhases={ilmPhases}
          openCreateCaseFlyout={openCreateCaseFlyout}
          patterns={patterns}
          patternIndexNames={patternIndexNames}
          patternRollups={patternRollups}
          theme={theme}
          updatePatternIndexNames={updatePatternIndexNames}
          updatePatternRollup={updatePatternRollup}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Body = React.memo(BodyComponent);
