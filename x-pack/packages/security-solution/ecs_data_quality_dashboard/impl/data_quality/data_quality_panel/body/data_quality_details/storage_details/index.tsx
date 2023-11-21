/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialTheme, Theme } from '@elastic/charts';
import React, { useMemo } from 'react';

import { getFlattenedBuckets } from './helpers';
import { StorageTreemap } from '../../../storage_treemap';
import { DEFAULT_MAX_CHART_HEIGHT, StorageTreemapContainer } from '../../../tabs/styles';
import { PatternRollup, SelectedIndex } from '../../../../types';
import { useDataQualityContext } from '../../../data_quality_context';

export interface Props {
  formatBytes: (value: number | undefined) => string;
  ilmPhases: string[];
  onIndexSelected: ({ indexName, pattern }: SelectedIndex) => void;
  patternRollups: Record<string, PatternRollup>;
  patterns: string[];
  theme?: PartialTheme;
  baseTheme: Theme;
}

const StorageDetailsComponent: React.FC<Props> = ({
  formatBytes,
  ilmPhases,
  onIndexSelected,
  patternRollups,
  patterns,
  theme,
  baseTheme,
}) => {
  const { isILMAvailable } = useDataQualityContext();

  const flattenedBuckets = useMemo(
    () =>
      getFlattenedBuckets({
        ilmPhases,
        isILMAvailable,
        patternRollups,
      }),
    [ilmPhases, isILMAvailable, patternRollups]
  );

  return (
    <StorageTreemapContainer data-test-subj="storageDetails">
      <StorageTreemap
        flattenedBuckets={flattenedBuckets}
        formatBytes={formatBytes}
        maxChartHeight={DEFAULT_MAX_CHART_HEIGHT}
        onIndexSelected={onIndexSelected}
        patterns={patterns}
        patternRollups={patternRollups}
        theme={theme}
        baseTheme={baseTheme}
      />
    </StorageTreemapContainer>
  );
};

StorageDetailsComponent.displayName = 'StorageDetailsComponent';
export const StorageDetails = React.memo(StorageDetailsComponent);
