/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  causeKiSchema,
  changePointOccurrenceEnum,
  dependencyEdgeSchema,
  evidenceSchema,
  impactEnum,
  infraComponentSchema,
} from '../common';

const discoveryDetectionEntrySchema = z.object({
  detection_id: z.string(),
  rule_name: z.string(),
  rule_uuid: z.string(),
  stream_name: z.string(),
  change_point_type: z.string(),
  event_count: z.number().int(),
  detected_at: z.string(),
});

const baseDiscoveryFields = {
  '@timestamp': z.iso.datetime(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  criticality: z.number().int(),
  confidence: z.number().int(),
  impact: impactEnum,
  rule_names: z.array(z.string()),
  stream_names: z.array(z.string()),
  detections: z.array(discoveryDetectionEntrySchema),
};

const findingFields = {
  ...baseDiscoveryFields,
  kind: z.literal('finding'),
  workflow_execution_id: z.string(),
  conversation_id: z.string(),
  change_point_occurrence: changePointOccurrenceEnum,
  dependency_edges: z.array(dependencyEdgeSchema),
  infra_components: z.array(infraComponentSchema),
  cause_kis: z.array(causeKiSchema),
  evidences: z.array(evidenceSchema),
  grouped_into: z.string().optional(),
};

const nonGroupFindingSchema = z.object({
  ...findingFields,
  previous_discovery_id: z.string().nullable(),
});

const groupFindingSchema = z.object({
  ...findingFields,
  grouped_discovery_ids: z.array(z.string()).min(1),
  grouping_rationale: z.string(),
});

const clearanceSchema = z.object({
  ...baseDiscoveryFields,
  kind: z.literal('clearance'),
  closes: z.string(),
  closed_by_execution_id: z.string(),
});

export const discoverySchema = z.union([
  groupFindingSchema,
  nonGroupFindingSchema,
  clearanceSchema,
]);

export type Discovery = z.infer<typeof discoverySchema>;
