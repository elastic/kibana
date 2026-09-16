/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { detectionRuleCommonFields } from './detection_rule_common_fields';

// ---------------------------------------------------------------------------
// Threshold rule builder fields schema
//
// Verbatim from the design (rule-data-model.md "security.detection.threshold").
// The threshold object keeps v1's normalized stored shape (ThresholdNormalized):
//   - field: always an array; empty array means no grouping
//   - value: the per-group count
//   - cardinality: a single optional distinct-count condition (capped at one,
//     where v1 accepted an unbounded array and silently read only the first)
//
// Unlike the custom query type, `query` here may be empty (a match-all
// pre-filter). The language field is still required when present.
//
// No defaults, no transforms — see rule-validation.md "No defaults, no transforms".
// ---------------------------------------------------------------------------

export const thresholdBuilderFieldsSchema = z
  .object({
    ...detectionRuleCommonFields,
    index: z.array(z.string().min(1).max(256)).min(1).max(32),
    query: z.string().max(8192),
    language: z.enum(['kuery', 'lucene']),
    threshold: z
      .object({
        field: z.array(z.string().min(1).max(256)).max(5),
        value: z.number().int().min(1),
        cardinality: z
          .array(
            z
              .object({
                field: z.string().min(1).max(256),
                value: z.number().int().min(0),
              })
              .strict()
          )
          .max(1)
          .optional(),
      })
      .strict(),
  })
  .strict();

export type ThresholdBuilderFields = z.infer<typeof thresholdBuilderFieldsSchema>;
