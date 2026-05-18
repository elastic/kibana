/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  dependencyEdgeSchema,
  infraComponentSchema,
  causeKiSchema,
  evidenceSchema,
} from '../common_schemas';

export const verdictSchema = z.object({
  '@timestamp': z.iso.datetime(),
  verdict: z.string(),
  verdict_id: z.string().optional(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  title: z.string().optional(),
  summary: z.string().optional(),
  root_cause: z.string().optional(),
  criticality: z.number().optional(),
  confidence: z.number().optional(),
  impact: z.string().optional(),
  recommended_action: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
  verdict_summary: z.string().optional(),
  assessment_note: z.string().optional(),
  conversation_id: z.string().optional(),
  workflow_execution_id: z.string().optional(),
  original_verdict: z.string().optional(),
  verdict_source: z.string().optional(),
  grouped_discovery_ids: z.array(z.string()).optional(),
  grouped_into: z.string().optional(),
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema).optional(),
  evidences: z.array(evidenceSchema).optional(),
});

export type Verdict = z.infer<typeof verdictSchema>;
