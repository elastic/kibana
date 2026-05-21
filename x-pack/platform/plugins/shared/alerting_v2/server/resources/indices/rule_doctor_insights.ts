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

export const RULE_DOCTOR_INSIGHTS_INDEX = '.rule-doctor-insights';
export const RULE_DOCTOR_INSIGHTS_VERSION = 2;
export const RULE_DOCTOR_INSIGHTS_ILM_POLICY_NAME = '.rule-doctor-insights-ilm-policy';
export const RULE_DOCTOR_INSIGHTS_PIPELINE_NAME = '.rule-doctor-insights-pipeline';

export const RULE_DOCTOR_INSIGHTS_ILM_POLICY: IlmPolicy = {
  _meta: { managed: true },
  phases: {
    hot: {
      actions: {},
    },
  },
};

const mappings: MappingsDefinition = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    insight_id: { type: 'keyword' },
    execution_id: { type: 'keyword' },
    status: { type: 'keyword' },
    type: { type: 'keyword' },
    action: { type: 'keyword' },
    impact: { type: 'keyword' },
    confidence: { type: 'keyword' },
    title: { type: 'text' },
    summary: { type: 'text' },
    justification: { type: 'text' },
    rule_ids: { type: 'keyword' },
    data: { type: 'flattened' },
    space_id: { type: 'keyword' },
  },
};

const insightStatusSchema = z.enum(['open', 'applied', 'dismissed']);
const insightImpactSchema = z.enum(['low', 'medium', 'high']);
const insightConfidenceSchema = z.enum(['low', 'medium', 'high']);

export const ruleDoctorInsightDocSchema = z.object({
  '@timestamp': z.string().describe('ISO 8601 timestamp when the insight was created'),
  insight_id: z.string().min(1).describe('Unique identifier for this insight'),
  execution_id: z
    .string()
    .describe('Identifier of the Rule Doctor analysis run that produced this insight'),
  status: insightStatusSchema.describe('Current lifecycle status of the insight'),
  type: z
    .string()
    .describe('Category of the insight, e.g. duplicate, stale, threshold, coverage_gap'),
  action: z
    .string()
    .describe('Recommended remediation action, e.g. merge, disable, adjust_threshold'),
  impact: insightImpactSchema.describe('Estimated severity if the insight is left unaddressed'),
  confidence: insightConfidenceSchema.describe('How confident the analysis is in this insight'),
  title: z.string().describe('Short human-readable title summarizing the insight'),
  summary: z.string().describe('Detailed explanation of the insight'),
  justification: z
    .string()
    .describe('Reasoning for why this insight was raised and the proposed action'),
  rule_ids: z
    .array(z.string())
    .optional()
    .default([])
    .describe('IDs of the alerting rules involved'),
  data: z
    .record(z.string(), z.any())
    .optional()
    .describe('Arbitrary structured data supporting the insight'),
  current: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('Current rule configuration snapshot'),
  proposed: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('Proposed rule configuration after applying the action'),
  diffs: z
    .array(
      z.object({
        field: z.string().describe('Dot-delimited path of the changed field'),
        previous: z.unknown().describe('Value before the proposed change'),
        proposed: z.unknown().describe('Value after the proposed change'),
      })
    )
    .optional()
    .describe('Field-level differences between current and proposed configurations'),
  space_id: z.string().describe('Kibana space ID where the insight applies'),
});

export type RuleDoctorInsightDoc = z.infer<typeof ruleDoctorInsightDocSchema>;
export type RuleDoctorInsightStatus = z.infer<typeof insightStatusSchema>;
export type RuleDoctorInsightImpact = z.infer<typeof insightImpactSchema>;
export type RuleDoctorInsightConfidence = z.infer<typeof insightConfidenceSchema>;

export const ruleDoctorInsightStatus = insightStatusSchema.enum;

export const getRuleDoctorInsightsResourceDefinition = (): IndexResourceDefinition => ({
  key: `index:${RULE_DOCTOR_INSIGHTS_INDEX}`,
  indexName: RULE_DOCTOR_INSIGHTS_INDEX,
  version: RULE_DOCTOR_INSIGHTS_VERSION,
  mappings,
  ilmPolicy: {
    name: RULE_DOCTOR_INSIGHTS_ILM_POLICY_NAME,
    policy: RULE_DOCTOR_INSIGHTS_ILM_POLICY,
  },
  pipeline: {
    name: RULE_DOCTOR_INSIGHTS_PIPELINE_NAME,
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
