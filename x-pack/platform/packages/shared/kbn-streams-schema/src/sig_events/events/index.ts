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

export const sigEventSchema = z.object({
  '@timestamp': z.iso.datetime({ offset: true }),
  created_at: z.iso.datetime({ offset: true }),
  event_id: z.string(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  previous_event_id: z.string().optional(),
  // TODO: rename to status once the data stream field is renamed
  verdict: z.string(),
  workflow_execution_id: z.string(),
  rule_names: z.array(z.string()).optional(),
  stream_names: z.array(z.string()),
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  criticality: z.number(),
  confidence: z.number(),
  recommended_action: z.string(),
  impact: z.string(),
  recommendations: z.array(z.string()),
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema).optional(),
  evidences: z.array(evidenceSchema).optional(),
  grouped_into: z.string().optional(),
  // TODO: rename once the data stream fields are renamed
  // Audit fields merged from verdict docs
  verdict_summary: z.string().max(MAX_TEXT_LENGTH).optional(),
  assessment_note: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export type SigEvent = z.infer<typeof sigEventSchema>;
