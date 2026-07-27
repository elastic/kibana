/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { MAX_ID_LENGTH, MAX_RULE_NAME_LENGTH } from '../constants';

/**
 * The full set of change-point types a detection can carry. A detection is
 * modelled as an immutable change-point observation: `change_point_type` is an
 * observation of the metric's behaviour at a point in time — spike/dip/etc. and
 * the settling observations `stationary`/`non_stationary`. It is NOT a lifecycle
 * state: nothing translates a change-point type into open/active/quiet/recovered.
 * Lifecycle belongs to the alerting engine and is read from the alerts.
 */
export const CHANGE_POINT_TYPES = [
  'dip',
  'distribution_change',
  'non_stationary',
  'spike',
  'stationary',
  'step_change',
  'trend_change',
] as const;

export type ChangePointType = (typeof CHANGE_POINT_TYPES)[number];

/**
 * Detection — an immutable change-point observation. `change_point_type` and
 * `p_value` are top-level (no nested `detection_evidence`). `processed` is derived
 * at read time from the presence of a processed marker (see `processedMarkerSchema`)
 * and is never stored on the detection.
 */
export const detectionSchema = z.object({
  '@timestamp': z.iso.datetime({ offset: true }),
  detection_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('ID of the detection document. Used for traceability back to the source alert.'),
  rule_uuid: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'UUID of the alerting rule that fired. Used to correlate signals with KI query rules.'
    ),
  rule_name: z
    .string()
    .max(MAX_RULE_NAME_LENGTH)
    .optional()
    .describe('Human-readable name of the alerting rule.'),
  stream_name: z.string().max(MAX_ID_LENGTH),
  change_point_type: z.enum(CHANGE_POINT_TYPES).describe(
    dedent`
        "spike" = Sudden increase in alert volume. May reflect increased failures, higher traffic or load, or a noisy rule.
        "dip" = Sudden decrease in alert volume. May reflect recovery, lower traffic, a disabled rule, or missing telemetry.
        "step_change" = Abrupt, sustained shift to a new alert-volume level. May reflect a deployment, configuration, capacity, or traffic-regime change.
        "trend_change" = Change in the direction or rate of an alert-volume trend. May reflect evolving load, progressive degradation or recovery, or a resource leak.
        "distribution_change" = Change in the overall distribution of alert volume. May reflect a traffic-mix change, rollout, or changed system behavior.
        "non_stationary" = Alert volume varies without a stable baseline. May reflect drift, recurring bursts, or chronic instability.
        "stationary" = Alert volume remains stable with no detected change. May represent either a healthy steady state or a sustained failure.
      `
  ),
  p_value: z
    .number()
    .describe(
      'Statistical p_value of the change point detection. Lower values indicate stronger signal.'
    ),
  severity_score: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Rule-configured severity score used to prioritize discovery work.'),
  alert_index: z.string().max(MAX_ID_LENGTH).optional(),
  workflow_execution_id: z.string().max(MAX_ID_LENGTH).optional(),
  // Derived at read time from processed-marker membership; never stored.
  processed: z.boolean(),
});

export type Detection = z.infer<typeof detectionSchema>;

/**
 * Processed marker — a minimal companion document written to the SAME data stream
 * to record that a detection has been ingested by the discovery pipeline. Distinguished
 * from a detection by field presence: detections carry `change_point_type`, markers carry
 * `processed_by`. `detection_id` references the exact detection the marker covers.
 */
export const processedMarkerSchema = z.object({
  '@timestamp': z.iso.datetime({ offset: true }),
  detection_id: z.string().max(MAX_ID_LENGTH),
  processed_by: z.string().max(MAX_ID_LENGTH),
});

export type ProcessedMarker = z.infer<typeof processedMarkerSchema>;
