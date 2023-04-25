/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  ilmPhases: string[];
  patterns: string[];
}

import {
  getTotalDocsCount,
  getTotalIncompatible,
  getTotalIndices,
  getTotalIndicesChecked,
  getTotalSizeInBytes,
  onPatternRollupUpdated,
  updateResultOnCheckCompleted,
} from './helpers';

import type { OnCheckCompleted, PartitionedFieldMetadata, PatternRollup } from '../types';

interface UseResultsRollup {
  onCheckCompleted: OnCheckCompleted;
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
    }: {
      error: string | null;
      formatBytes: (value: number | undefined) => string;
      formatNumber: (value: number | undefined) => string;
      indexName: string;
      partitionedFieldMetadata: PartitionedFieldMetadata | null;
      pattern: string;
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
    },
    []
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
    totalSizeInBytes,
    updatePatternIndexNames,
    updatePatternRollup,
  };
};
