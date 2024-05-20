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
  PartialTheme,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { Pattern } from '../../../pattern';
import { PatternRollup, SelectedIndex } from '../../../../types';

export interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  endDate?: string | null;
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
  isAssistantEnabled: boolean;
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
  selectedIndex: SelectedIndex | null;
  setSelectedIndex: (selectedIndex: SelectedIndex | null) => void;
  startDate?: string | null;
  theme?: PartialTheme;
  baseTheme: Theme;
  updatePatternIndexNames: ({
    indexNames,
    pattern,
  }: {
    indexNames: string[];
    pattern: string;
  }) => void;
  updatePatternRollup: (patternRollup: PatternRollup) => void;
}

const IndicesDetailsComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  endDate,
  formatBytes,
  formatNumber,
  getGroupByFieldsOnClick,
  ilmPhases,
  isAssistantEnabled,
  openCreateCaseFlyout,
  patternIndexNames,
  patternRollups,
  patterns,
  selectedIndex,
  setSelectedIndex,
  startDate,
  theme,
  baseTheme,
  updatePatternIndexNames,
  updatePatternRollup,
}) => (
  <div data-test-subj="indicesDetails">
    {patterns.map((pattern, i) => (
      <EuiFlexItem grow={false} key={pattern}>
        <Pattern
          addSuccessToast={addSuccessToast}
          canUserCreateAndReadCases={canUserCreateAndReadCases}
          endDate={endDate}
          formatBytes={formatBytes}
          formatNumber={formatNumber}
          getGroupByFieldsOnClick={getGroupByFieldsOnClick}
          ilmPhases={ilmPhases}
          indexNames={patternIndexNames[pattern]}
          isAssistantEnabled={isAssistantEnabled}
          openCreateCaseFlyout={openCreateCaseFlyout}
          pattern={pattern}
          patternRollup={patternRollups[pattern]}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          startDate={startDate}
          theme={theme}
          baseTheme={baseTheme}
          updatePatternIndexNames={updatePatternIndexNames}
          updatePatternRollup={updatePatternRollup}
        />
        {patterns[i + 1] && <EuiSpacer data-test-subj="bodyPatternSpacer" size="s" />}
      </EuiFlexItem>
    ))}
  </div>
);

IndicesDetailsComponent.displayName = 'IndicesDetailsComponent';

export const IndicesDetails = React.memo(IndicesDetailsComponent);
