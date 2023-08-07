/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EcsVersion } from '@kbn/ecs';

import {
  getTotalDocsCount,
  getTotalIncompatible,
  getTotalIndices,
  getTotalIndicesChecked,
  getTotalSizeInBytes,
  onPatternRollupUpdated,
  updateResultOnCheckCompleted,
} from './helpers';

import type { OnCheckAllCompleted, OnCheckCompleted, PatternRollup } from '../types';
import { getDocsCount, getSizeInBytes } from '../helpers';
import { getIndexIncompatible } from '../data_quality_panel/pattern/helpers';
import { useDataQualityContext } from '../data_quality_panel/data_quality_context';

interface Props {
  ilmPhases: string[];
  patterns: string[];
}
interface UseResultsRollup {
  onCheckCompleted: OnCheckCompleted;
  onCheckAllCompleted: OnCheckAllCompleted;
  patternIndexNames: Record<string, string[]>;
  patternRollups: Record<string, PatternRollup>;
  totalDocsCount: number | undefined;
  totalIncompatible: number | undefined;
  totalIndices: number | undefined;
  totalIndicesChecked: number | undefined;
  totalSizeInBytes: number | undefined;
  updatePatternIndexNames: ({
    indexNames,
    pattern,
  }: {
    indexNames: string[];
    pattern: string;
  }) => void;
  updatePatternRollup: (patternRollup: PatternRollup) => void;
}

export const useResultsRollup = ({ ilmPhases, patterns }: Props): UseResultsRollup => {
  const [patternIndexNames, setPatternIndexNames] = useState<Record<string, string[]>>({});
  const [patternRollups, setPatternRollups] = useState<Record<string, PatternRollup>>({});
  const { telemetryEvents } = useDataQualityContext();
  const updatePatternRollup = useCallback((patternRollup: PatternRollup) => {
    setPatternRollups((current) =>
      onPatternRollupUpdated({ patternRollup, patternRollups: current })
    );
  }, []);

  const totalDocsCount = useMemo(() => getTotalDocsCount(patternRollups), [patternRollups]);
  const totalIncompatible = useMemo(() => getTotalIncompatible(patternRollups), [patternRollups]);
  const totalIndices = useMemo(() => getTotalIndices(patternRollups), [patternRollups]);
  const totalIndicesChecked = useMemo(
    () => getTotalIndicesChecked(patternRollups),
    [patternRollups]
  );
  const totalSizeInBytes = useMemo(() => getTotalSizeInBytes(patternRollups), [patternRollups]);

  const updatePatternIndexNames = useCallback(
    ({ indexNames, pattern }: { indexNames: string[]; pattern: string }) => {
      setPatternIndexNames((current) => ({
        ...current,
        [pattern]: indexNames,
      }));
    },
    []
  );

  const onCheckCompleted: OnCheckCompleted = useCallback(
    ({
      error,
      formatBytes,
      formatNumber,
      indexName,
      partitionedFieldMetadata,
      pattern,
      requestTime,
    }) => {
      setPatternRollups((current) =>
        updateResultOnCheckCompleted({
          error,
          formatBytes,
          formatNumber,
          indexName,
          partitionedFieldMetadata,
          pattern,
          patternRollups: current,
        })
      );

      telemetryEvents.reportDataQualityIndexChecked?.({
        error: error ?? undefined,
        pattern,
        indexName,
        numberOfDocuments: getDocsCount({ indexName, stats: patternRollups[pattern].stats }),
        numberOfIncompatibleFields: getIndexIncompatible({
          indexName,
          results: patternRollups[pattern].results,
        }),
        numberOfIndices: patternRollups[pattern].indices,
        sizeInBytes: getSizeInBytes({ stats: patternRollups[pattern].stats, indexName }),
        timeConsumedMs: requestTime,
        ecsVersion: EcsVersion,
        isCheckAll: true,
      });
    },
    [patternRollups, telemetryEvents]
  );

  const onCheckAllCompleted = useCallback(
    ({ requestTime }: { requestTime: number }) => {
      telemetryEvents.reportDataQualityCheckAllClicked?.({
        numberOfDocuments: totalDocsCount,
        numberOfIncompatibleFields: totalIncompatible,
        numberOfIndices: totalIndices,
        numberOfIndicesChecked: totalIndicesChecked,
        sizeInBytes: totalSizeInBytes,
        timeConsumedMs: requestTime,
        ecsVersion: EcsVersion,
      });
    },
    [
      telemetryEvents,
      totalDocsCount,
      totalIncompatible,
      totalIndices,
      totalIndicesChecked,
      totalSizeInBytes,
    ]
  );

  useEffect(() => {
    // reset all state
    setPatternRollups({});
    setPatternIndexNames({});
  }, [ilmPhases, patterns]);

  return {
    onCheckCompleted,
    onCheckAllCompleted,
    patternIndexNames,
    patternRollups,
    totalDocsCount,
    totalIncompatible,
    totalIndices,
    totalIndicesChecked,
    totalSizeInBytes,
    updatePatternIndexNames,
    updatePatternRollup,
  };
};
