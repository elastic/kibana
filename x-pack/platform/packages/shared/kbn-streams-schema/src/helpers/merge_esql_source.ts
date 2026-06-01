/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedObject } from '@kbn/std';
import type { SampleDocument } from '../shared/record_types';

/**
 * When METADATA _source is included in an ES|QL query, each result row
 * contains a `_source` object alongside the typed column values. This
 * function supplements the ES|QL columns with unmapped fields from
 * `_source` so draft stream samples show the full document — matching
 * the behavior of the Search API used for materialized streams.
 *
 * ES|QL column values are authoritative (they may have been cast or
 * transformed by the view). `_source` only contributes fields that
 * don't exist as ES|QL columns.
 */
export function mergeSourceIntoDocuments(docs: SampleDocument[]): SampleDocument[] {
  return docs.map((doc) => {
    const { _source, _id, ...columnFields } = doc;
    if (!_source || typeof _source !== 'object') {
      return columnFields;
    }
    const flatSource = getFlattenedObject(_source as Record<string, unknown>);
    const columnKeys = new Set(Object.keys(columnFields));
    const merged: SampleDocument = { ...columnFields };
    for (const [key, value] of Object.entries(flatSource)) {
      if (!columnKeys.has(key)) {
        merged[key] = value;
      }
    }
    return merged;
  });
}
