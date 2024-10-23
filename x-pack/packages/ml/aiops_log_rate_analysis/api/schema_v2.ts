/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const significantItem = schema.object({
  key: schema.string(),
  type: schema.oneOf([schema.literal('keyword'), schema.literal('log_pattern')]),
  fieldName: schema.string(),
  fieldValue: schema.oneOf([schema.string(), schema.number()]),
  doc_count: schema.number(),
  bg_count: schema.number(),
  total_doc_count: schema.number(),
  total_bg_count: schema.number(),
  score: schema.number(),
  pValue: schema.nullable(schema.number()),
  normalizedScore: schema.number(),
  histogram: schema.maybe(
    schema.arrayOf(
      schema.object({
        doc_count_overall: schema.number(),
        doc_count_significant_item: schema.number(),
        key: schema.number(),
        key_as_string: schema.string(),
      })
    )
  ),
  unique: schema.maybe(schema.boolean()),
});

const overridesV2 = schema.object({
  loaded: schema.maybe(schema.number()),
  remainingFieldCandidates: schema.maybe(schema.arrayOf(schema.string())),
  significantItems: schema.maybe(schema.arrayOf(significantItem)),
  regroupOnly: schema.maybe(schema.boolean()),
});

export const aiopsLogRateAnalysisBase = schema.object({
  start: schema.number(),
  end: schema.number(),
  searchQuery: schema.string(),
  timeFieldName: schema.string(),
  includeFrozen: schema.maybe(schema.boolean()),
  grouping: schema.maybe(schema.boolean()),
  /** Analysis selection time ranges */
  baselineMin: schema.number(),
  baselineMax: schema.number(),
  deviationMin: schema.number(),
  deviationMax: schema.number(),
  /** The index to query for log rate analysis */
  index: schema.string(),
  /** Settings to override headers derived compression and flush fix */
  compressResponse: schema.maybe(schema.boolean()),
  flushFix: schema.maybe(schema.boolean()),
  /** Probability used for the random sampler aggregations */
  sampleProbability: schema.maybe(schema.number()),
});

export const aiopsLogRateAnalysisSchemaV2 = schema.intersection([
  aiopsLogRateAnalysisBase,
  /** Overrides to skip steps of the analysis with existing data */
  schema.object({ overrides: schema.maybe(overridesV2) }),
]);

export type AiopsLogRateAnalysisSchemaV2 = TypeOf<typeof aiopsLogRateAnalysisSchemaV2>;
export type AiopsLogRateAnalysisSchemaSignificantItem = TypeOf<typeof significantItem>;
