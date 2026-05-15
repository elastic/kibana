/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const eventDependencyEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  protocol: z.string().optional(),
  exposure: z.string().optional(),
});

const eventInfraComponentSchema = z.object({
  title: z.string().optional(),
  workloads: z.array(z.string()).optional(),
  exposure: z.string().optional(),
});

const eventCauseKiSchema = z.object({
  name: z.string().optional(),
  stream_name: z.string().optional(),
});

const eventEvidenceSchema = z.object({
  rule_name: z.string().optional(),
  result: z.string().optional(),
  description: z.string().optional(),
  stream_name: z.string().optional(),
  row_count: z.number().optional(),
  collected_at: z.string().optional(),
  esql_query: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
});

export const sigEventSchema = z.object({
  '@timestamp': z.iso.datetime(),
  created_at: z.iso.datetime().optional(),
  event_id: z.string(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  previous_event_id: z.string().optional(),
  verdict: z.string().optional(),
  verdict_id: z.string(),
  workflow_execution_id: z.string().optional(),
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  title: z.string().optional(),
  summary: z.string().optional(),
  root_cause: z.string().optional(),
  criticality: z.number().optional(),
  recommended_action: z.string().optional(),
  impact: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
  dependency_edges: z.array(eventDependencyEdgeSchema).optional(),
  infra_components: z.array(eventInfraComponentSchema).optional(),
  cause_kis: z.array(eventCauseKiSchema).optional(),
  evidences: z.array(eventEvidenceSchema).optional(),
  grouped_into: z.string().optional(),
});

export type SigEvent = z.infer<typeof sigEventSchema>;
