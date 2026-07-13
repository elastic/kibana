/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import { sigEventBaseSchema } from '../common_schemas';
import { MAX_ID_LENGTH, MAX_RULE_NAME_LENGTH, MAX_TEXT_LENGTH } from '../constants';

export const discoveryDetectionSchema = z.object({
  kind: z.enum(['detection', 'quiet', 'handled']),
  detection_id: z.string().max(MAX_ID_LENGTH).optional(),
  rule_name: z.string().max(MAX_RULE_NAME_LENGTH).optional(),
  rule_uuid: z.string().max(MAX_ID_LENGTH).optional(),
  stream_name: z.string().max(MAX_STREAM_NAME_LENGTH).optional(),
  change_point_type: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'Change point type detected by the alerting rule. ' +
        '"spike" = sudden increase in alert volume (load surge, cascading failure, noisy rule); ' +
        '"dip" = sudden decrease — often means the service went DOWN and stopped producing data, not a recovery; ' +
        '"step_change" = sustained level shift (config change, new deployment, capacity change); ' +
        '"trend_change" = gradual directional shift (growing workload, degrading performance, slow leak); ' +
        '"distribution_change" = overall distribution shifted (mixed traffic pattern, deployment rollout); ' +
        '"non_stationary" = no discrete change point but not stationary — gradual drift, chronic instability, weak signal; ' +
        '"stationary" = no change point found — distribution stable, rule returned to normal, false positive, or noise.'
    ),
  p_value: z
    .number()
    .optional()
    .describe(
      'Statistical p_value of the change point detection. Lower values indicate stronger signal. ' +
        '≤0.05: credible signal — proceed with full investigation. ' +
        '0.05–0.10: weak signal — require KI backing or confirming failure rows before escalating. ' +
        '>0.10: low credibility — likely noise; do not promote without strong corroborating evidence.'
    ),
  event_count: z.number().optional(),
  alert_count: z.number().optional(),
});

export const discoverySchema = sigEventBaseSchema.extend({
  '@timestamp': z.iso.datetime(),
  kind: z
    .enum(['discovery', 'clearance', 'handled'])
    .describe(
      '"discovery" for an open investigation episode; ' +
        '"clearance" when the episode has recovered; ' +
        '"handled" to stamp the episode as fully processed after the significant event has been written.'
    ),
  discovery_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'Unique ID for this discovery document version. Auto-generated when omitted. ' +
        'Required for "handled" kind to reference the discovery being stamped as fully processed.'
    ),
  discovered_at: z.iso.datetime().optional(),
  rule_names: z.array(z.string().max(MAX_RULE_NAME_LENGTH)).max(100),
  impact: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      'Human-readable summary of which users or systems are affected and what they cannot do.'
    ),
  detections: z.array(discoveryDetectionSchema),
  parent_discovery_id: z.string().max(MAX_ID_LENGTH).optional(),
  grouped_discovery_ids: z.array(z.string().max(MAX_ID_LENGTH)).optional(),
  grouping_rationale: z.string().max(MAX_TEXT_LENGTH).optional(),
  previous_discovery_id: z.string().max(MAX_ID_LENGTH).optional(),
  change_point_occurrence: z.string().max(MAX_ID_LENGTH).optional(),
  closed_by_execution_id: z.string().max(MAX_ID_LENGTH).optional(),
  processed: z.boolean(),
});

export type Discovery = z.infer<typeof discoverySchema>;
