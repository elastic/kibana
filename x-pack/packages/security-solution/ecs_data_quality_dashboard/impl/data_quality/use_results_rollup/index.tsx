/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EcsVersion } from '@kbn/ecs';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import {
  getTotalDocsCount,
  getTotalIncompatible,
  getTotalIndices,
  getTotalIndicesChecked,
  getTotalSameFamily,
  getTotalSizeInBytes,
  onPatternRollupUpdated,
  postResult,
  updateResultOnCheckCompleted,
} from './helpers';

import type { OnCheckCompleted, PatternRollup } from '../types';
import { getDocsCount, getIndexId, getSizeInBytes, getTotalPatternSameFamily } from '../helpers';
import { getIlmPhase, getIndexIncompatible } from '../data_quality_panel/pattern/helpers';
import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import {
  getIncompatibleMappingsFields,
  getIncompatibleValuesFields,
  getSameFamilyFields,
} from '../data_quality_panel/tabs/incompatible_tab/helpers';

const storage = new Storage(localStorage);

interface Props {
  ilmPhases: string[];
  patterns: string[];
}
interface UseResultsRollup {
  onCheckCompleted: OnCheckCompleted;
  patternIndexNames: Record<string, string[]>;
  patternRollups: Record<string, PatternRollup>;
  totalDocsCount: number | undefined;
  totalIncompatible: number | undefined;
  totalIndices: number | undefined;
  totalIndicesChecked: number | undefined;
  totalSameFamily: number | undefined;
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
  const { httpFetch } = useDataQualityContext();
  const [patternIndexNames, setPatternIndexNames] = useState<Record<string, string[]>>(
    // storage.get('data_quality_pattern_index_names') || {}
    {}
  );
  const [patternRollups, setPatternRollups] = useState<Record<string, PatternRollup>>(
    storage.get('data_quality_pattern_rollups') || {}
  );

  const updatePatternRollups = useCallback(
    (updateRollups: (current: Record<string, PatternRollup>) => Record<string, PatternRollup>) => {
      console.log('updatePatternRollup');
      setPatternRollups((current) => {
        const updated = updateRollups(current);
        storage.set('data_quality_pattern_rollups', updated);
        return updated;
      });
    },
    []
  );

  const { telemetryEvents, isILMAvailable } = useDataQualityContext();
  const updatePatternRollup = useCallback(
    (patternRollup: PatternRollup) => {
      updatePatternRollups((current) => ({ ...current, [patternRollup.pattern]: patternRollup }));
    },
    [updatePatternRollups]
  );

  const totalDocsCount = useMemo(() => getTotalDocsCount(patternRollups), [patternRollups]);
  const totalIncompatible = useMemo(() => getTotalIncompatible(patternRollups), [patternRollups]);
  const totalIndices = useMemo(() => getTotalIndices(patternRollups), [patternRollups]);
  const totalIndicesChecked = useMemo(
    () => getTotalIndicesChecked(patternRollups),
    [patternRollups]
  );
  const totalSameFamily = useMemo(() => getTotalSameFamily(patternRollups), [patternRollups]);
  const totalSizeInBytes = useMemo(() => getTotalSizeInBytes(patternRollups), [patternRollups]);

  const updatePatternIndexNames = useCallback(
    ({ indexNames, pattern }: { indexNames: string[]; pattern: string }) => {
      setPatternIndexNames((current) => {
        const updated = { ...current, [pattern]: indexNames };
        // storage.set('data_quality_pattern_index_names', updated);
        return updated;
      });
    },
    []
  );

  const onCheckCompleted: OnCheckCompleted = useCallback(
    ({
      batchId,
      checkAllStartTime,
      error,
      formatBytes,
      formatNumber,
      indexName,
      partitionedFieldMetadata,
      pattern,
      requestTime,
      isLastCheck,
    }) => {
      console.log('onCheckCompleted');

      setPatternRollups((currentPatternRollups) => {
        const updatedRollups = updateResultOnCheckCompleted({
          error,
          formatBytes,
          formatNumber,
          indexName,
          isILMAvailable,
          partitionedFieldMetadata,
          pattern,
          patternRollups: currentPatternRollups,
        });
        storage.set('data_quality_pattern_rollups', updatedRollups);

        const updatedRollup = updatedRollups[pattern];
        const { stats, results, ilmExplain } = updatedRollup;
        const indexId = getIndexId({ indexName, stats });

        if (
          indexId != null &&
          stats &&
          results &&
          ilmExplain &&
          requestTime != null &&
          requestTime > 0 &&
          partitionedFieldMetadata
        ) {
          const checkMetadata = {
            batchId,
            ecsVersion: EcsVersion,
            errorCount: error ? 1 : 0,
            ilmPhase: getIlmPhase(ilmExplain[indexName], isILMAvailable),
            indexId,
            indexName,
            isCheckAll: true,
            numberOfDocuments: getDocsCount({ indexName, stats }),
            numberOfIncompatibleFields: getIndexIncompatible({
              indexName,
              results,
            }),
            numberOfIndices: 1,
            numberOfIndicesChecked: 1,
            numberOfSameFamily: getTotalPatternSameFamily(results),
            sameFamilyFields: getSameFamilyFields(partitionedFieldMetadata.sameFamily),
            sizeInBytes: getSizeInBytes({ stats, indexName }),
            timeConsumedMs: requestTime,
            unallowedMappingFields: getIncompatibleMappingsFields(
              partitionedFieldMetadata.incompatible
            ),
            unallowedValueFields: getIncompatibleValuesFields(
              partitionedFieldMetadata.incompatible
            ),
          };
          telemetryEvents.reportDataQualityIndexChecked?.(checkMetadata);

          postResult({
            abortController: new AbortController(),
            httpFetch,
            result: {
              meta: checkMetadata,
              data: updatedRollup,
            },
          });
        }

        if (isLastCheck) {
          telemetryEvents.reportDataQualityCheckAllCompleted?.({
            batchId,
            ecsVersion: EcsVersion,
            isCheckAll: true,
            numberOfDocuments: getTotalDocsCount(updatedRollups),
            numberOfIncompatibleFields: getTotalIncompatible(updatedRollups),
            numberOfIndices: getTotalIndices(updatedRollups),
            numberOfIndicesChecked: getTotalIndicesChecked(updatedRollups),
            numberOfSameFamily: getTotalSameFamily(updatedRollups),
            sizeInBytes: getTotalSizeInBytes(updatedRollups),
            timeConsumedMs: Date.now() - checkAllStartTime,
          });
        }
        return updatedRollups;
      });
    },
    [httpFetch, isILMAvailable, telemetryEvents]
  );

  useEffect(() => {
    // reset all state
    setPatternRollups(storage.get('data_quality_pattern_rollups') || {});
    setPatternIndexNames({});
  }, [ilmPhases, patterns]);

  return {
    onCheckCompleted,
    patternIndexNames,
    patternRollups,
    totalDocsCount,
    totalIncompatible,
    totalIndices,
    totalIndicesChecked,
    totalSameFamily,
    totalSizeInBytes,
    updatePatternIndexNames,
    updatePatternRollup,
  };
};
