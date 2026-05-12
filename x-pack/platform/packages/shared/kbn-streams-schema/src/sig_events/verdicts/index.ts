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
  verdictWithGroupedEnum,
} from '../common';

export const verdictSchema = z.object({
  '@timestamp': z.iso.datetime(),
  verdict: verdictWithGroupedEnum,
  verdict_id: z.string().optional(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  criticality: z.number().int(),
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  recommended_action: recommendedActionEnum.optional(),
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  verdict_summary: z.string(),
  assessment_note: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
  impact: impactEnum.optional(),
  confidence: z.number().int(),
  original_verdict: verdictEnum.optional(),
  verdict_source: z.string().optional(),
  workflow_execution_id: z.string(),
  conversation_id: z.string().optional(),
  grouped_discovery_ids: z.array(z.string()).optional(),
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema),
  evidences: z.array(evidenceSchema).optional(),
});

export type Verdict = z.infer<typeof verdictSchema>;
