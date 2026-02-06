/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord, SampleDocument } from '@kbn/streams-schema';

/**
 * Sample with data source ID (returned from simulation state machine)
 */
export interface SampleWithDataSource {
  dataSourceId: string;
  document: SampleDocument;
}

/**
 * Creates a WeakMap that maps from preview document objects to their original (pre-transformation)
 * grok field values. This is needed when the grok pattern extracts into the same field it reads from
 * (e.g., message → message).
 *
 * We use a WeakMap keyed by the document object reference for O(1) lookup in renderCellValue,
 * since renderCellValue receives the document object but not the row index.
 *
 * @param previewDocuments - The transformed (post-simulation) documents
 * @param originalSamples - The original (pre-simulation) samples with their documents
 * @param grokField - The field name that the grok processor reads from
 * @returns A WeakMap mapping each preview document to its original grok field value
 */
export function createOriginalGrokFieldValuesMap(
  previewDocuments: FlattenRecord[],
  originalSamples: SampleWithDataSource[],
  grokField: string
): WeakMap<FlattenRecord, string | undefined> {
  const map = new WeakMap<FlattenRecord, string | undefined>();

  previewDocuments.forEach((doc, index) => {
    const originalDoc = originalSamples[index]?.document;
    if (originalDoc) {
      const flattened = flattenObjectNestedLast(originalDoc) as FlattenRecord;
      const value = flattened[grokField];
      map.set(doc, typeof value === 'string' ? value : undefined);
    }
  });

  return map;
}

/**
 * Gets the value to display for a grok field, preferring the original (pre-transformation) value
 * over the transformed value. This ensures highlighting works correctly even when the grok pattern
 * extracts into the same field it reads from.
 *
 * @param document - The document (may be flattened preview document or sample document)
 * @param columnId - The column/field ID being rendered
 * @param grokField - The grok processor's source field
 * @param originalGrokFieldValues - Map of original field values (if available)
 * @returns The value to display, or undefined if no valid string value exists
 */
export function getGrokFieldDisplayValue(
  document: SampleDocument | FlattenRecord,
  columnId: string,
  grokField: string,
  originalGrokFieldValues?: WeakMap<FlattenRecord, string | undefined>
): string | undefined {
  if (columnId !== grokField) {
    return undefined;
  }

  // Try to get the original value first (for overwriting grok patterns)
  const originalValue = originalGrokFieldValues?.get(document as FlattenRecord);
  if (typeof originalValue === 'string') {
    return originalValue;
  }

  // Fall back to the document's value
  const value = document[columnId];
  return typeof value === 'string' ? value : undefined;
}
