/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_LEGEND_CATEGORIES, RANDOM_SAMPLE_SEED } from '../../common/constants';
import { INFERENCE_FIELDS_SOURCE, readSemanticTextVector } from './semantic_text';

export type VectorFieldKind = 'dense_vector' | 'semantic_text';

export interface VectorSample {
  vectors: number[][];
  /** Category index per vector; `undefined` when no label field is configured. */
  categoryIndices?: number[];
  /** Category names ordered by frequency. */
  categories?: string[];
  /** Whether the last category groups overflow and missing labels. */
  hasOtherCategory?: boolean;
  /** Number of hits skipped because the vector was missing or had a different dimension. */
  skipped: number;
}

interface VectorSampleRequestParams {
  index: string;
  query: estypes.QueryDslQueryContainer;
  vectorField: string;
  vectorFieldKind: VectorFieldKind;
  labelField?: string;
  /** Number of hits in this request. */
  size: number;
  /** Offset of this page within the sample. */
  from?: number;
  runtimeMappings?: estypes.MappingRuntimeFields;
}

const getRequestedFields = (
  vectorField: string,
  vectorFieldKind: VectorFieldKind,
  labelField: string | undefined
): string[] => [
  ...(vectorFieldKind === 'dense_vector' ? [vectorField] : []),
  ...(labelField ? [labelField] : []),
];

/**
 * Builds a seeded random-sample search. Dense vectors come back through the `fields` option and
 * semantic_text embeddings through `_source._inference_fields`.
 */
export const buildVectorSampleRequest = ({
  index,
  query,
  vectorField,
  vectorFieldKind,
  labelField,
  size,
  from,
  runtimeMappings,
}: VectorSampleRequestParams): estypes.SearchRequest => {
  const fields = getRequestedFields(vectorField, vectorFieldKind, labelField);
  return {
    index,
    size,
    ...(from ? { from } : {}),
    track_total_hits: false,
    _source: vectorFieldKind === 'semantic_text' ? INFERENCE_FIELDS_SOURCE : false,
    ...(fields.length > 0 ? { fields } : {}),
    query: {
      function_score: {
        query,
        functions: [{ random_score: { seed: RANDOM_SAMPLE_SEED, field: '_seq_no' } }],
        boost_mode: 'replace',
      },
    },
    ...(runtimeMappings && Object.keys(runtimeMappings).length > 0
      ? { runtime_mappings: runtimeMappings }
      : {}),
  };
};

const readVector = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const flat = Array.isArray(value[0]) ? (value[0] as unknown[]) : value;
  return flat.every((n) => typeof n === 'number') ? (flat as number[]) : undefined;
};

const readLabel = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined || first === null ? undefined : String(first);
};

interface ParseVectorSampleOptions {
  vectorField: string;
  vectorFieldKind: VectorFieldKind;
  labelField?: string;
  otherLabel: string;
}

/** Extracts vectors and categorical labels from search hits. */
export const parseVectorSampleResponse = (
  hits: ReadonlyArray<estypes.SearchHit>,
  { vectorField, vectorFieldKind, labelField, otherLabel }: ParseVectorSampleOptions
): VectorSample => {
  const vectors: number[][] = [];
  const labels: Array<string | undefined> = [];
  let dims: number | undefined;
  let skipped = 0;

  for (const { fields, _source: source } of hits) {
    const vector =
      vectorFieldKind === 'semantic_text'
        ? readSemanticTextVector(source, vectorField)
        : readVector(fields?.[vectorField]);
    if (!vector || (dims !== undefined && vector.length !== dims)) {
      skipped++;
      continue;
    }
    dims = vector.length;
    vectors.push(vector);
    if (labelField) labels.push(readLabel(fields?.[labelField]));
  }

  if (!labelField) return { vectors, skipped };

  const counts = new Map<string, number>();
  for (const label of labels) {
    if (label !== undefined) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label);
  const topCategories = ranked.slice(0, MAX_LEGEND_CATEGORIES);
  const hasOther = ranked.length > topCategories.length || labels.includes(undefined);
  const categories = hasOther ? [...topCategories, otherLabel] : topCategories;
  const indexByLabel = new Map(topCategories.map((label, i) => [label, i]));
  const otherIndex = topCategories.length;

  return {
    vectors,
    categoryIndices: labels.map((label) =>
      label === undefined ? otherIndex : indexByLabel.get(label) ?? otherIndex
    ),
    categories,
    hasOtherCategory: hasOther,
    skipped,
  };
};
