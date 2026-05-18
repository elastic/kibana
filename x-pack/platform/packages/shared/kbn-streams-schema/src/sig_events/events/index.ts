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
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema).optional(),
  evidences: z.array(evidenceSchema).optional(),
  grouped_into: z.string().optional(),
});

export type SigEvent = z.infer<typeof sigEventSchema>;
