/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { sigEventBaseSchema } from '../common_schemas';
import { detectionSchema } from '../detections';
import { MAX_ID_LENGTH, MAX_RULE_NAME_LENGTH, MAX_TEXT_LENGTH } from '../constants';
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
  detections: z.array(
    detectionSchema.omit({
      '@timestamp': true,
      alert_index: true,
      workflow_execution_id: true,
      processed: true,
    })
  ),
  parent_discovery_id: z.string().max(MAX_ID_LENGTH).optional(),
  grouped_discovery_ids: z.array(z.string().max(MAX_ID_LENGTH)).optional(),
  grouping_rationale: z.string().max(MAX_TEXT_LENGTH).optional(),
  previous_discovery_id: z.string().max(MAX_ID_LENGTH).optional(),
  change_point_occurrence: z.string().max(MAX_ID_LENGTH).optional(),
  closed_by_execution_id: z.string().max(MAX_ID_LENGTH).optional(),
  processed: z.boolean(),
});

export type Discovery = z.infer<typeof discoverySchema>;
