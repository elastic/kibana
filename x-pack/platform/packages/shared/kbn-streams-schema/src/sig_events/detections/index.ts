/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const detectionEvidenceSchema = z.object({
  change_point_type: z.string(),
  p_value: z.number(),
});

const baseDetectionFields = {
  '@timestamp': z.iso.datetime(),
  detection_id: z.string(),
  rule_uuid: z.string(),
  rule_name: z.string(),
  stream: z.string(),
  alert_count: z.number().int(),
  alert_index: z.string(),
  workflow_execution_id: z.string(),
  resolution_lookback_minutes: z.number().int(),
  detection_evidence: detectionEvidenceSchema,
  superseded: z.boolean(),
  superseded_at: z.iso.datetime().optional(),
  processed_by: z.string().optional(),
};

const fullDetectionSchema = z.object({
  ...baseDetectionFields,
  silent: z.literal(false),
  alert_samples: z.array(z.unknown()),
  rules_activity: z.array(z.unknown()),
  peak_30m_alert_count: z.number().int(),
});

const silentDetectionSchema = z.object({
  ...baseDetectionFields,
  silent: z.literal(true),
  peak_30m_alert_count: z.number().int().optional(),
});

export const detectionSchema = z.discriminatedUnion('silent', [
  fullDetectionSchema,
  silentDetectionSchema,
]);

export type Detection = z.infer<typeof detectionSchema>;
