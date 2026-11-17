/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

const DENSE_EMBEDDING_TASK_TYPES: readonly string[] = ['text_embedding', 'embedding'];

/**
 * Embeddings live in `_source._inference_fields`, which Elasticsearch omits unless `exclude_vectors`
 * is false. Narrower includes are ignored, so every semantic_text field of a hit is returned.
 */
export const INFERENCE_FIELDS_SOURCE: estypes.SearchSourceFilter = {
  includes: ['_inference_fields'],
  exclude_vectors: false,
};

interface InferenceChunk {
  embeddings?: unknown;
}

interface InferenceFieldValue {
  inference?: {
    model_settings?: { task_type?: string };
    chunks?: Record<string, InferenceChunk[] | undefined>;
  };
}

const getInferenceFields = (
  source: unknown
): Record<string, InferenceFieldValue | undefined> | undefined => {
  if (typeof source !== 'object' || source === null || !('_inference_fields' in source)) {
    return undefined;
  }
  const { _inference_fields: inferenceFields } = source;
  return typeof inferenceFields === 'object' && inferenceFields !== null
    ? (inferenceFields as Record<string, InferenceFieldValue | undefined>)
    : undefined;
};

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every((n) => typeof n === 'number');

/** Averages the chunk embeddings of a dense semantic_text field into one vector per document. */
export const readSemanticTextVector = (source: unknown, field: string): number[] | undefined => {
  const chunks = Object.values(getInferenceFields(source)?.[field]?.inference?.chunks ?? {}).flat();
  const embeddings = chunks
    .map((chunk) => chunk?.embeddings)
    .filter(isNumberArray)
    .filter((embedding, _, all) => embedding.length === all[0].length);
  if (embeddings.length === 0) return undefined;
  if (embeddings.length === 1) return embeddings[0];

  const mean = new Array<number>(embeddings[0].length).fill(0);
  for (const embedding of embeddings) {
    for (let i = 0; i < mean.length; i++) mean[i] += embedding[i] / embeddings.length;
  }
  return mean;
};

/** Small sample used to discover semantic_text fields, since data views report them as `text`. */
export const buildSemanticTextProbeRequest = (
  index: string,
  size: number
): estypes.SearchRequest => ({
  index,
  size,
  track_total_hits: false,
  _source: INFERENCE_FIELDS_SOURCE,
  query: { match_all: {} },
});

/** Returns the semantic_text fields in the hits whose inference endpoint produces dense embeddings. */
export const parseDenseSemanticTextFields = (hits: ReadonlyArray<estypes.SearchHit>): string[] => {
  const fields = new Set<string>();
  for (const { _source: source } of hits) {
    for (const [name, value] of Object.entries(getInferenceFields(source) ?? {})) {
      const taskType = value?.inference?.model_settings?.task_type;
      if (taskType && DENSE_EMBEDDING_TASK_TYPES.includes(taskType)) fields.add(name);
    }
  }
  return [...fields].sort();
};
