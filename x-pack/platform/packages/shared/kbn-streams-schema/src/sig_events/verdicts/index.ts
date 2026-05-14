/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const verdictDependencyEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  protocol: z.string().optional(),
  exposure: z.string().optional(),
});

const verdictInfraComponentSchema = z.object({
  title: z.string().optional(),
  workloads: z.array(z.string()).optional(),
  exposure: z.string().optional(),
});

const verdictCauseKiSchema = z.object({
  name: z.string().optional(),
  stream_name: z.string().optional(),
});

const verdictEvidenceSchema = z.object({
  rule_name: z.string().optional(),
  result: z.string().optional(),
  description: z.string().optional(),
  stream_name: z.string().optional(),
  row_count: z.number().optional(),
  collected_at: z.string().optional(),
  esql_query: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
});

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
  dependency_edges: z.array(verdictDependencyEdgeSchema).optional(),
  infra_components: z.array(verdictInfraComponentSchema).optional(),
  cause_kis: z.array(verdictCauseKiSchema).optional(),
  evidences: z.array(verdictEvidenceSchema).optional(),
});

export type Verdict = z.infer<typeof verdictSchema>;
