/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  GrokProcessor,
  DissectProcessor,
  StreamlangProcessorDefinitionWithUIAttributes,
} from '@kbn/streamlang';
import { useGrokExpressions } from '@kbn/grok-ui';
import type { FlattenRecord, ProcessorMetrics } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import {
  createOriginalFieldValuesMap,
  grokExpressionOverwritesSourceField,
  dissectPatternOverwritesSourceField,
  hasPrecedingProcessorTouchedField,
  type SampleWithDataSource,
} from './processor_outcome_preview_helpers';

interface ProcessorHighlightModeArgs {
  processor: StreamlangProcessorDefinitionWithUIAttributes | undefined;
  allColumns: string[];
  stepIds: string[];
  currentStepId: string | undefined;
  processorsMetrics: Partial<Record<string, ProcessorMetrics>> | undefined;
  originalSamples: SampleWithDataSource[] | undefined;
  previewDocuments: FlattenRecord[];
}

interface ProcessorHighlightModeResult {
  grokMode: boolean;
  validGrokField: string | undefined;
  grokPatterns: string[];
  originalGrokFieldValues: WeakMap<FlattenRecord, string | undefined> | undefined;

  dissectMode: boolean;
  validDissectField: string | undefined;
  dissectPattern: string;
  originalDissectFieldValues: WeakMap<FlattenRecord, string | undefined> | undefined;

  highlightColumns: string[] | undefined;
}

/**
 * Encapsulates the processor detection and highlight mode logic for both grok and dissect.
 *
 * Determines whether the current draft processor supports bi-directional coloring,
 * validates the source field, checks for overwrites and preceding processor interference,
 * and computes the original field values map when needed.
 */
export const useProcessorHighlightMode = ({
  processor,
  allColumns,
  stepIds,
  currentStepId,
  processorsMetrics,
  originalSamples,
  previewDocuments,
}: ProcessorHighlightModeArgs): ProcessorHighlightModeResult => {
  const grokPatterns = processor?.action === 'grok' ? (processor as GrokProcessor).patterns : [];

  const grokExpressions = useGrokExpressions(grokPatterns);

  const isGrokActive = processor?.action === 'grok' && !isEmpty(processor.from);
  const grokSourceField = isGrokActive ? (processor as GrokProcessor).from : undefined;
  const validGrokSourceField =
    grokSourceField && allColumns.includes(grokSourceField) ? grokSourceField : undefined;

  const grokOverwrites = useMemo(() => {
    if (!validGrokSourceField || grokExpressions.length === 0) return false;
    return grokExpressionOverwritesSourceField(grokExpressions, validGrokSourceField);
  }, [grokExpressions, validGrokSourceField]);

  const precedingTouchedGrok = useMemo(() => {
    if (!validGrokSourceField) return false;
    return hasPrecedingProcessorTouchedField(
      stepIds,
      currentStepId,
      processorsMetrics,
      validGrokSourceField
    );
  }, [stepIds, currentStepId, processorsMetrics, validGrokSourceField]);

  const grokMode =
    isGrokActive && validGrokSourceField !== undefined && !(grokOverwrites && precedingTouchedGrok);

  const validGrokField = grokMode ? validGrokSourceField : undefined;

  const dissectPattern =
    processor?.action === 'dissect' ? (processor as DissectProcessor).pattern : '';

  const isDissectActive = processor?.action === 'dissect' && !isEmpty(processor.from);
  const dissectSourceField = isDissectActive ? (processor as DissectProcessor).from : undefined;
  const validDissectSourceField =
    dissectSourceField && allColumns.includes(dissectSourceField) ? dissectSourceField : undefined;

  const dissectOverwrites = useMemo(() => {
    if (!validDissectSourceField || !dissectPattern) return false;
    return dissectPatternOverwritesSourceField(dissectPattern, validDissectSourceField);
  }, [dissectPattern, validDissectSourceField]);

  const precedingTouchedDissect = useMemo(() => {
    if (!validDissectSourceField) return false;
    return hasPrecedingProcessorTouchedField(
      stepIds,
      currentStepId,
      processorsMetrics,
      validDissectSourceField
    );
  }, [stepIds, currentStepId, processorsMetrics, validDissectSourceField]);

  const dissectMode =
    isDissectActive &&
    validDissectSourceField !== undefined &&
    !(dissectOverwrites && precedingTouchedDissect);

  const validDissectField = dissectMode ? validDissectSourceField : undefined;

  const originalGrokFieldValues = useMemo(() => {
    if (!grokMode || !validGrokField || !originalSamples) return undefined;
    if (!grokOverwrites) return undefined;
    return createOriginalFieldValuesMap(previewDocuments, originalSamples, validGrokField);
  }, [grokMode, validGrokField, originalSamples, previewDocuments, grokOverwrites]);

  const originalDissectFieldValues = useMemo(() => {
    if (!dissectMode || !validDissectField || !originalSamples) return undefined;
    if (!dissectOverwrites) return undefined;
    return createOriginalFieldValuesMap(previewDocuments, originalSamples, validDissectField);
  }, [dissectMode, validDissectField, originalSamples, previewDocuments, dissectOverwrites]);

  const grokColumns = useMemo(
    () => (validGrokField ? [validGrokField] : undefined),
    [validGrokField]
  );

  const dissectColumns = useMemo(
    () => (validDissectField ? [validDissectField] : undefined),
    [validDissectField]
  );

  const highlightColumns = grokColumns ?? dissectColumns;

  return {
    grokMode,
    validGrokField,
    grokPatterns,
    originalGrokFieldValues,
    dissectMode,
    validDissectField,
    dissectPattern,
    originalDissectFieldValues,
    highlightColumns,
  };
};
