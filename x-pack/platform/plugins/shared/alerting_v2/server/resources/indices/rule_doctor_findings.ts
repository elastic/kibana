/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { z } from '@kbn/zod/v4';
import type { IndexResourceDefinition } from './types';

export const RULE_DOCTOR_FINDINGS_INDEX = '.rule-doctor-findings';
export const RULE_DOCTOR_FINDINGS_VERSION = 1;
export const RULE_DOCTOR_FINDINGS_ILM_POLICY_NAME = '.rule-doctor-findings-ilm-policy';
export const RULE_DOCTOR_FINDINGS_PIPELINE_NAME = '.rule-doctor-findings-pipeline';

export const RULE_DOCTOR_FINDINGS_ILM_POLICY: IlmPolicy = {
  _meta: { managed: true },
  phases: {
    hot: {
      actions: {},
    },
    delete: {
      min_age: '90d',
      actions: {
        delete: {},
      },
    },
  },
};

const mappings: MappingsDefinition = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    finding_id: { type: 'keyword' },
    execution_id: { type: 'keyword' },
    status: { type: 'keyword' },
    type: { type: 'keyword' },
    action: { type: 'keyword' },
    impact: { type: 'keyword' },
    confidence: { type: 'keyword' },
    title: { type: 'text' },
    summary: { type: 'text' },
    rule_ids: { type: 'keyword' },
    data: { type: 'flattened' },
    space_id: { type: 'keyword' },
  },
};

const findingStatusSchema = z.enum(['open', 'applied', 'dismissed']);
const findingImpactSchema = z.enum(['low', 'medium', 'high']);
const findingConfidenceSchema = z.enum(['low', 'medium', 'high']);

export const ruleDoctorFindingDocSchema = z.object({
  '@timestamp': z.string(),
  finding_id: z.string().min(1),
  execution_id: z.string(),
  status: findingStatusSchema,
  type: z.string(),
  action: z.string(),
  impact: findingImpactSchema,
  confidence: findingConfidenceSchema,
  title: z.string(),
  summary: z.string(),
  rule_ids: z.array(z.string()).optional().default([]),
  data: z.record(z.string(), z.any()).optional(),
  current: z.record(z.string(), z.unknown()).nullable(),
  proposed: z.record(z.string(), z.unknown()).nullable(),
  diffs: z
    .array(
      z.object({
        field: z.string(),
        previous: z.unknown(),
        proposed: z.unknown(),
      })
    )
    .optional(),
  space_id: z.string(),
});

export type RuleDoctorFindingDoc = z.infer<typeof ruleDoctorFindingDocSchema>;
export type RuleDoctorFindingStatus = z.infer<typeof findingStatusSchema>;
export type RuleDoctorFindingImpact = z.infer<typeof findingImpactSchema>;
export type RuleDoctorFindingConfidence = z.infer<typeof findingConfidenceSchema>;

export const ruleDoctorFindingStatus = findingStatusSchema.enum;

export const getRuleDoctorFindingsResourceDefinition = (): IndexResourceDefinition => ({
  key: `index:${RULE_DOCTOR_FINDINGS_INDEX}`,
  indexName: RULE_DOCTOR_FINDINGS_INDEX,
  version: RULE_DOCTOR_FINDINGS_VERSION,
  mappings,
  ilmPolicy: {
    name: RULE_DOCTOR_FINDINGS_ILM_POLICY_NAME,
    policy: RULE_DOCTOR_FINDINGS_ILM_POLICY,
  },
  pipeline: {
    name: RULE_DOCTOR_FINDINGS_PIPELINE_NAME,
    processors: [
      {
        set: {
          field: '@timestamp',
          value: '{{{_ingest.timestamp}}}',
          override: false,
        },
      },
      { json: { field: 'rule_ids', if: 'ctx.rule_ids instanceof String' } },
      { json: { field: 'data', if: 'ctx.data instanceof String' } },
      { json: { field: 'current', if: 'ctx.current instanceof String' } },
      { json: { field: 'proposed', if: 'ctx.proposed instanceof String' } },
      { json: { field: 'diffs', if: 'ctx.diffs instanceof String' } },
    ],
  },
});
