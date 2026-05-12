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
  infraComponentSchema,
} from '../common';

export const sigEventSchema = z.object({
  '@timestamp': z.iso.datetime(),
  verdict: z.string().optional(),
  event_id: z.string(),
  previous_event_id: z.string().optional(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  criticality: z.number().int().optional(),
  grouped_into: z.string().optional(),
  last_reviewed_at: z.iso.datetime().optional(),
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  verdict_id: z.string(),
  recommended_action: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  root_cause: z.string().optional(),
  recommendations: z.string().optional(),
  impact: z.string().optional(),
  workflow_execution_id: z.string().optional(),
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema).optional(),
  evidences: z.array(evidenceSchema).optional(),
});

export type SigEvent = z.infer<typeof sigEventSchema>;
