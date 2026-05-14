/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const discoveryDetectionSchema = z.object({
  detection_id: z.string().optional(),
  rule_name: z.string().optional(),
  rule_uuid: z.string().optional(),
  stream_name: z.string().optional(),
  change_point_type: z.string().optional(),
  event_count: z.number().optional(),
  detected_at: z.string().optional(),
});

const dependencyEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  protocol: z.string().optional(),
  exposure: z.string().optional(),
});

const infraComponentSchema = z.object({
  title: z.string().optional(),
  workloads: z.array(z.string()).optional(),
  exposure: z.string().optional(),
});

const causeKiSchema = z.object({
  name: z.string().optional(),
  stream_name: z.string().optional(),
});

const evidenceSchema = z.object({
  rule_name: z.string().optional(),
  result: z.string().optional(),
  description: z.string().optional(),
  stream_name: z.string().optional(),
  row_count: z.number().optional(),
  collected_at: z.string().optional(),
  esql_query: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
});

export const discoverySchema = z.object({
  '@timestamp': z.iso.datetime(),
  kind: z.string(),
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
  detections: z.array(discoveryDetectionSchema).optional(),
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema).optional(),
  evidences: z.array(evidenceSchema).optional(),
  closes: z.string().optional(),
  grouped_into: z.string().optional(),
  grouped_discovery_ids: z.array(z.string()).optional(),
  grouping_rationale: z.string().optional(),
  previous_discovery_id: z.string().optional(),
  change_point_occurrence: z.string().optional(),
  workflow_execution_id: z.string().optional(),
  conversation_id: z.string().optional(),
  closed_by_execution_id: z.string().optional(),
});

export type Discovery = z.infer<typeof discoverySchema>;
