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

import { DataQualitySummary } from '../data_quality_summary';
import { Pattern } from '../pattern';
import { useResultsRollup } from '../../use_results_rollup';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  defaultNumberFormat: string;
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
  defaultNumberFormat,
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
    updatePatternIndexNames,
    updatePatternRollup,
  } = useResultsRollup({ ilmPhases, patterns });

  return (
    <EuiFlexGroup data-test-subj="body" direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DataQualitySummary
          addSuccessToast={addSuccessToast}
          canUserCreateAndReadCases={canUserCreateAndReadCases}
          defaultNumberFormat={defaultNumberFormat}
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
          onCheckCompleted={onCheckCompleted}
        />
        <EuiSpacer size="l" />
      </EuiFlexItem>

      {patterns.map((pattern, i) => (
        <EuiFlexItem grow={false} key={pattern}>
          <Pattern
            addSuccessToast={addSuccessToast}
            canUserCreateAndReadCases={canUserCreateAndReadCases}
            defaultNumberFormat={defaultNumberFormat}
            getGroupByFieldsOnClick={getGroupByFieldsOnClick}
            ilmPhases={ilmPhases}
            indexNames={patternIndexNames[pattern]}
            openCreateCaseFlyout={openCreateCaseFlyout}
            pattern={pattern}
            patternRollup={patternRollups[pattern]}
            theme={theme}
            updatePatternIndexNames={updatePatternIndexNames}
            updatePatternRollup={updatePatternRollup}
          />
          {i !== patterns.length - 1 ? <EuiSpacer size="s" /> : null}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const Body = React.memo(BodyComponent);
