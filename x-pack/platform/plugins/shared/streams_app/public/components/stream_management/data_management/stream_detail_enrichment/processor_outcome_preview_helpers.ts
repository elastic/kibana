/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { DraftGrokExpression } from '@kbn/grok-ui';
import { parseDissectPattern } from '@kbn/streamlang';
import type { FlattenRecord, ProcessorMetrics, SampleDocument } from '@kbn/streams-schema';

/**
 * Sample with data source ID (returned from simulation state machine)
 */
export interface SampleWithDataSource {
  dataSourceId: string;
  document: SampleDocument;
}

/**
 * Creates a WeakMap that maps from preview document objects to their original (pre-transformation)
 * field values. This is needed when a processor (grok/dissect) extracts into the same field it
 * reads from (e.g., message → message).
 *
 * We use a WeakMap keyed by the document object reference for O(1) lookup in renderCellValue,
 * since renderCellValue receives the document object but not the row index.
 */
export function createOriginalFieldValuesMap(
  previewDocuments: FlattenRecord[],
  originalSamples: SampleWithDataSource[],
  sourceField: string
): WeakMap<FlattenRecord, string | undefined> {
  const map = new WeakMap<FlattenRecord, string | undefined>();

  previewDocuments.forEach((doc, index) => {
    const originalDoc = originalSamples[index]?.document;
    if (originalDoc) {
      const flattened = flattenObjectNestedLast(originalDoc) as FlattenRecord;
      const value = flattened[sourceField];
      map.set(doc, typeof value === 'string' ? value : undefined);
    }
  });

  return map;
}

/**
 * Gets the value to display for a processor's source field, preferring the original
 * (pre-transformation) value over the transformed value. This ensures highlighting works
 * correctly even when the processor extracts into the same field it reads from.
 */
export function getSourceFieldDisplayValue(
  document: SampleDocument | FlattenRecord,
  columnId: string,
  sourceField: string,
  originalFieldValues?: WeakMap<FlattenRecord, string | undefined>
): string | undefined {
  if (columnId !== sourceField) {
    return undefined;
  }

  const originalValue = originalFieldValues?.get(document as FlattenRecord);
  if (typeof originalValue === 'string') {
    return originalValue;
  }

  const value = document[columnId];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Checks if any processor preceding the current one has modified the source field.
 * Used to determine whether the original (pre-transformation) value is safe to use
 * for highlighting.
 */
export function hasPrecedingProcessorTouchedField(
  stepIds: string[],
  currentStepId: string | undefined,
  processorsMetrics: Partial<Record<string, ProcessorMetrics>> | undefined,
  sourceField: string
): boolean {
  if (!currentStepId || !processorsMetrics) {
    return false;
  }

  const currentStepIndex = stepIds.indexOf(currentStepId);
  if (currentStepIndex <= 0) {
    return false;
  }

  const precedingStepIds = stepIds.slice(0, currentStepIndex);

  return precedingStepIds.some((stepId) => {
    const metrics = processorsMetrics[stepId];
    return metrics?.detected_fields?.includes(sourceField) ?? false;
  });
}

/**
 * Checks if any of the grok expressions extract into the same field that they read from.
 */
export function grokExpressionOverwritesSourceField(
  grokExpressions: DraftGrokExpression[],
  sourceField: string
): boolean {
  return grokExpressions.some((grokExpression) => {
    const fields = grokExpression.getFields();
    return Array.from(fields.values()).some((field) => field.name === sourceField);
  });
}

/**
 * Checks if a dissect pattern extracts into the same field that it reads from.
 */
export function dissectPatternOverwritesSourceField(pattern: string, sourceField: string): boolean {
  const fields = parseDissectPattern(pattern);
  return fields.some((field) => field.name === sourceField);
}
