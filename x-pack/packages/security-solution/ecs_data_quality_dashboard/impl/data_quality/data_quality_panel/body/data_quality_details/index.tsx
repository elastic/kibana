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

import React, { useCallback, useState } from 'react';

import { IlmPhasesEmptyPrompt } from '../../../ilm_phases_empty_prompt';
import { IndicesDetails } from './indices_details';
import { StorageDetails } from './storage_details';
import { PatternRollup, SelectedIndex } from '../../../types';

export interface Props {
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
  theme: Theme;
  updatePatternIndexNames: ({
    indexNames,
    pattern,
  }: {
    indexNames: string[];
    pattern: string;
  }) => void;
  updatePatternRollup: (patternRollup: PatternRollup) => void;
}

const DataQualityDetailsComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  formatBytes,
  formatNumber,
  getGroupByFieldsOnClick,
  ilmPhases,
  openCreateCaseFlyout,
  patternIndexNames,
  patternRollups,
  patterns,
  theme,
  updatePatternIndexNames,
  updatePatternRollup,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<SelectedIndex | null>(null);

  const onIndexSelected = useCallback(async ({ indexName, pattern }: SelectedIndex) => {
    setSelectedIndex({ indexName, pattern });
  }, []);

  if (ilmPhases.length === 0) {
    return <IlmPhasesEmptyPrompt />;
  }

  return (
    <>
      <StorageDetails
        formatBytes={formatBytes}
        ilmPhases={ilmPhases}
        onIndexSelected={onIndexSelected}
        patterns={patterns}
        theme={theme}
        patternRollups={patternRollups}
      />

      <IndicesDetails
        addSuccessToast={addSuccessToast}
        canUserCreateAndReadCases={canUserCreateAndReadCases}
        formatBytes={formatBytes}
        formatNumber={formatNumber}
        getGroupByFieldsOnClick={getGroupByFieldsOnClick}
        ilmPhases={ilmPhases}
        openCreateCaseFlyout={openCreateCaseFlyout}
        patterns={patterns}
        theme={theme}
        patternIndexNames={patternIndexNames}
        patternRollups={patternRollups}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        updatePatternIndexNames={updatePatternIndexNames}
        updatePatternRollup={updatePatternRollup}
      />
    </>
  );
};

DataQualityDetailsComponent.displayName = 'DataQualityDetailsComponent';
export const DataQualityDetails = React.memo(DataQualityDetailsComponent);
