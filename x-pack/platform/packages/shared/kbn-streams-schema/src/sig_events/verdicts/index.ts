/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  causeKiSchema,
  dependencyEdgeSchema,
  evidenceSchema,
  impactEnum,
  infraComponentSchema,
  recommendedActionEnum,
  verdictEnum,
} from '../common';

const sharedVerdictFields = {
  '@timestamp': z.iso.datetime(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  workflow_execution_id: z.string(),
  criticality: z.number().int(),
  confidence: z.number().int(),
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  verdict_summary: z.string(),
  cause_kis: z.array(causeKiSchema),
};

const judgeVerdictSchema = z.object({
  ...sharedVerdictFields,
  verdict: verdictEnum,
  verdict_id: z.string(),
  recommended_action: recommendedActionEnum,
  assessment_note: z.string(),
  recommendations: z.array(z.string()),
  impact: impactEnum,
  original_verdict: verdictEnum,
  verdict_source: z.literal('judge_discoveries'),
  conversation_id: z.string(),
  dependency_edges: z.array(dependencyEdgeSchema),
  infra_components: z.array(infraComponentSchema),
  evidences: z.array(evidenceSchema),
  grouped_discovery_ids: z.array(z.string()).optional(),
});

const groupedSourceVerdictSchema = z.object({
  ...sharedVerdictFields,
  verdict: z.literal('grouped'),
  grouped_into: z.string(),
});

export const verdictSchema = z.union([judgeVerdictSchema, groupedSourceVerdictSchema]);

export type Verdict = z.infer<typeof verdictSchema>;
