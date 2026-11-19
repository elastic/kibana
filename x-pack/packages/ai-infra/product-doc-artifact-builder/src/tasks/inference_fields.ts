/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit, SearchRequest } from '@elastic/elasticsearch/lib/api/types';

/**
 * Search options that keep semantic_text embeddings on the hit.
 * Elasticsearch 9.2+ omits them from `_source` unless `exclude_vectors` is false.
 * Older clusters return them only on `hit.fields` when `_inference_fields` is requested.
 */
export const inferenceFieldSearchOptions = {
  _source: { exclude_vectors: false },
  fields: ['_inference_fields'],
} as const satisfies Pick<SearchRequest, '_source' | 'fields'>;

/** Copies precomputed semantic_text embeddings onto the document written to the artifact. */
export const documentWithInferenceFields = (hit: SearchHit): Record<string, unknown> => {
  const doc: Record<string, unknown> = {
    ...((hit._source as Record<string, unknown> | undefined) ?? {}),
  };

  if (doc._inference_fields) {
    return doc;
  }

  const fromFields = hit.fields?._inference_fields;
  if (fromFields == null) {
    return doc;
  }

  // The fields API wraps the object in a single-element array.
  doc._inference_fields = Array.isArray(fromFields) ? fromFields[0] : fromFields;
  return doc;
};
