/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialTheme, Theme } from '@elastic/charts';
import React, { useCallback, useMemo } from 'react';

import { getFlattenedBuckets } from './helpers';
import { StorageTreemap } from '../../../storage_treemap';
import { DEFAULT_MAX_CHART_HEIGHT, StorageTreemapContainer } from '../../../tabs/styles';
import { PatternRollup, SelectedIndex } from '../../../../types';
import { useDataQualityContext } from '../../../data_quality_context';
import { DOCS_UNIT } from './translations';

export interface Props {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhases: string[];
  onIndexSelected: ({ indexName, pattern }: SelectedIndex) => void;
  patternRollups: Record<string, PatternRollup>;
  patterns: string[];
  theme?: PartialTheme;
  baseTheme: Theme;
}

const StorageDetailsComponent: React.FC<Props> = ({
  formatBytes,
  formatNumber,
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
  const accessor = flattenedBuckets[0]?.sizeInBytes != null ? 'sizeInBytes' : 'docsCount';
  const valueFormatter = useCallback(
    (d: number) =>
      accessor === 'sizeInBytes' ? formatBytes(d) : `${formatNumber(d)} ${DOCS_UNIT(d)}`,
    [accessor, formatBytes, formatNumber]
  );

  return (
    <StorageTreemapContainer data-test-subj="storageDetails">
      <StorageTreemap
        accessor={accessor}
        baseTheme={baseTheme}
        flattenedBuckets={flattenedBuckets}
        maxChartHeight={DEFAULT_MAX_CHART_HEIGHT}
        onIndexSelected={onIndexSelected}
        patternRollups={patternRollups}
        patterns={patterns}
        theme={theme}
        valueFormatter={valueFormatter}
      />
    </StorageTreemapContainer>
  );
};

StorageDetailsComponent.displayName = 'StorageDetailsComponent';
export const StorageDetails = React.memo(StorageDetailsComponent);
