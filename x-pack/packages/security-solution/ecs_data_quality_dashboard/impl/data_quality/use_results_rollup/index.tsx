/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EcsVersion } from '@elastic/ecs';

import { isEmpty } from 'lodash/fp';
import {
  getTotalDocsCount,
  getTotalIncompatible,
  getTotalIndices,
  getTotalIndicesChecked,
  getTotalSameFamily,
  getTotalSizeInBytes,
  updateResultOnCheckCompleted,
} from './helpers';

import type { DataQualityCheckResult, OnCheckCompleted, PatternRollup } from '../types';
import {
  getDocsCount,
  getIndexId,
  getStorageResults,
  getSizeInBytes,
  getTotalPatternSameFamily,
  postStorageResult,
  formatStorageResult,
  formatResultFromStorage,
} from '../helpers';
import { getIlmPhase, getIndexIncompatible } from '../data_quality_panel/pattern/helpers';
import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import {
  getIncompatibleMappingsFields,
  getIncompatibleValuesFields,
  getSameFamilyFields,
} from '../data_quality_panel/tabs/incompatible_tab/helpers';

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

const useStoredPatternResults = (patterns: string[]) => {
  const { httpFetch, toasts } = useDataQualityContext();
  const [storedPatternResults, setStoredPatternResults] = useState<
    Array<{ pattern: string; results: Record<string, DataQualityCheckResult> }>
  >([]);

  useEffect(() => {
    if (isEmpty(patterns)) {
      return;
    }

    let ignore = false;
    const abortController = new AbortController();
    const fetchStoredPatternResults = async () => {
      const requests = patterns.map((pattern) =>
        getStorageResults({ pattern, httpFetch, abortController, toasts }).then((results = []) => ({
          pattern,
          results: Object.fromEntries(
            results.map((storageResult) => [
              storageResult.indexName,
              formatResultFromStorage({ storageResult, pattern }),
            ])
          ),
        }))
      );
      const patternResults = await Promise.all(requests);
      if (patternResults?.length && !ignore) {
        setStoredPatternResults(patternResults);
      }
    };

    fetchStoredPatternResults();
    return () => {
      ignore = true;
    };
  }, [httpFetch, patterns, toasts]);

  return storedPatternResults;
};

export const useResultsRollup = ({ ilmPhases, patterns }: Props): UseResultsRollup => {
  const { httpFetch, toasts } = useDataQualityContext();
  const [patternIndexNames, setPatternIndexNames] = useState<Record<string, string[]>>({});
  const [patternRollups, setPatternRollups] = useState<Record<string, PatternRollup>>({});

  const storedPatternsResults = useStoredPatternResults(patterns);

  useEffect(() => {
    if (!isEmpty(storedPatternsResults)) {
      setPatternRollups((current) =>
        storedPatternsResults.reduce(
          (acc, { pattern, results }) => ({
            ...acc,
            [pattern]: {
              ...current[pattern],
              pattern,
              results,
            },
          }),
          current
        )
      );
    }
  }, [storedPatternsResults]);

  const { telemetryEvents, isILMAvailable } = useDataQualityContext();
  const updatePatternRollup = useCallback((patternRollup: PatternRollup) => {
    setPatternRollups((current) => ({
      ...current,
      [patternRollup.pattern]: {
        ...patternRollup,
        results: patternRollup.results ?? current[patternRollup.pattern]?.results, // prevent undefined results override existing
      },
    }));
  }, []);

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
      setPatternIndexNames((current) => ({ ...current, [pattern]: indexNames }));
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
          const report = {
            batchId,
            ecsVersion: EcsVersion,
            errorCount: error ? 1 : 0,
            ilmPhase: getIlmPhase(ilmExplain[indexName], isILMAvailable),
            indexId,
            indexName,
            isCheckAll: true,
            numberOfDocuments: getDocsCount({ indexName, stats }),
            numberOfFields: partitionedFieldMetadata.all.length,
            numberOfIncompatibleFields: getIndexIncompatible({
              indexName,
              results,
            }),
            numberOfEcsFields: partitionedFieldMetadata.ecsCompliant.length,
            numberOfCustomFields: partitionedFieldMetadata.custom.length,
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
          telemetryEvents.reportDataQualityIndexChecked?.(report);

          const result = results[indexName];
          if (result) {
            const storageResult = formatStorageResult({ result, report, partitionedFieldMetadata });
            postStorageResult({ storageResult, httpFetch, toasts });
          }
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
    [httpFetch, isILMAvailable, telemetryEvents, toasts]
  );

  useEffect(() => {
    // reset all state
    setPatternRollups({});
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
