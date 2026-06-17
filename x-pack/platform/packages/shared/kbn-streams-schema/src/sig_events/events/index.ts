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
import { MAX_TEXT_LENGTH } from '../constants';

export const SIG_EVENT_STATUS_OPTIONS = ['promoted', 'acknowledged', 'demoted'] as const;
export const sigEventStatusSchema = z.enum(SIG_EVENT_STATUS_OPTIONS);
export type SigEventStatus = z.infer<typeof sigEventStatusSchema>;

export const SIG_EVENT_IMPACT_OPTIONS = ['critical', 'high', 'medium', 'low'] as const;
export const sigEventImpactSchema = z.enum(SIG_EVENT_IMPACT_OPTIONS);
export type SigEventImpact = z.infer<typeof sigEventImpactSchema>;

export const sigEventSchema = z.strictObject({
  '@timestamp': z.iso.datetime({ offset: true }),
  created_at: z.iso.datetime({ offset: true }),
  event_id: z.string().max(255),
  discovery_id: z.string().max(255).optional(),
  discovery_slug: z.string().max(255),
  previous_event_id: z.string().max(255).optional(),
  status: sigEventStatusSchema,
  workflow_execution_id: z.string().max(255).optional(),
  rule_names: z.array(z.string().max(255)).max(100).optional(),
  stream_names: z.array(z.string().max(255)).max(100),
  title: z.string().max(500),
  summary: z.string().max(4000),
  root_cause: z.string().max(4000),
  criticality: z.number(),
  confidence: z.number(),
  recommended_action: z.string().max(200).optional(),
  impact: sigEventImpactSchema,
  recommendations: z.array(z.string().max(1000)).max(50),
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema).optional(),
  evidences: z.array(evidenceSchema).optional(),
  grouped_into: z.string().max(255).optional(),
  analysis_summary: z.string().max(MAX_TEXT_LENGTH).optional(),
  assessment_note: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export type SigEvent = z.infer<typeof sigEventSchema>;
