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
import { getDocsCount, getIndexId, getSizeInBytes } from '../helpers';
import { getIlmPhase, getIndexIncompatible } from '../data_quality_panel/pattern/helpers';
import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import {
  getIncompatibleMappingsFields,
  getIncompatibleValuesFields,
} from '../data_quality_panel/tabs/incompatible_tab/helpers';

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
      batchId,
      error,
      formatBytes,
      formatNumber,
      indexName,
      partitionedFieldMetadata,
      pattern,
      requestTime,
    }) => {
      const indexId = getIndexId({ indexName, stats: patternRollups[pattern].stats });
      const ilmExplain = patternRollups[pattern].ilmExplain;

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

      if (
        indexId != null &&
        patternRollups[pattern].stats &&
        patternRollups[pattern].results &&
        requestTime != null &&
        requestTime > 0 &&
        partitionedFieldMetadata &&
        ilmExplain
      ) {
        telemetryEvents.reportDataQualityIndexChecked?.({
          batchId,
          ecsVersion: EcsVersion,
          errorCount: error ? 1 : 0,
          ilmPhase: getIlmPhase(ilmExplain[indexName]),
          indexId,
          isCheckAll: true,
          numberOfDocuments: getDocsCount({ indexName, stats: patternRollups[pattern].stats }),
          numberOfIncompatibleFields: getIndexIncompatible({
            indexName,
            results: patternRollups[pattern].results,
          }),
          numberOfIndices: 1,
          numberOfIndicesChecked: 1,
          sizeInBytes: getSizeInBytes({ stats: patternRollups[pattern].stats, indexName }),
          timeConsumedMs: requestTime,
          unallowedMappingFields: getIncompatibleMappingsFields(
            partitionedFieldMetadata.incompatible
          ),
          unallowedValueFields: getIncompatibleValuesFields(partitionedFieldMetadata.incompatible),
        });
      }
    },
    [patternRollups, telemetryEvents]
  );

  const onCheckAllCompleted: OnCheckAllCompleted = useCallback(
    ({ requestTime, batchId }) => {
      if (totalIncompatible != null) {
        telemetryEvents.reportDataQualityCheckAllCompleted?.({
          batchId,
          ecsVersion: EcsVersion,
          isCheckAll: true,
          numberOfDocuments: totalDocsCount,
          numberOfIncompatibleFields: totalIncompatible,
          numberOfIndices: totalIndices,
          numberOfIndicesChecked: totalIndicesChecked,
          sizeInBytes: totalSizeInBytes,
          timeConsumedMs: requestTime,
        });
      }
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
