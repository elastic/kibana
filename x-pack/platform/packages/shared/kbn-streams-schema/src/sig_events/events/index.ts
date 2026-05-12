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

export const sigEventSchema = z.object({
  '@timestamp': z.iso.datetime(),
  verdict: verdictEnum,
  event_id: z.string(),
  previous_event_id: z.string().optional(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  criticality: z.number().int(),
  grouped_into: z.string().optional(),
  last_reviewed_at: z.iso.datetime(),
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  verdict_id: z.string(),
  recommended_action: recommendedActionEnum,
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  recommendations: z.array(z.string()),
  impact: impactEnum,
  workflow_execution_id: z.string(),
  dependency_edges: z.array(dependencyEdgeSchema),
  infra_components: z.array(infraComponentSchema),
  cause_kis: z.array(causeKiSchema),
  evidences: z.array(evidenceSchema),
});

export type SigEvent = z.infer<typeof sigEventSchema>;
