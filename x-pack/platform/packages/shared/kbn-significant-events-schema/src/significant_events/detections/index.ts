/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
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
  detection_id: z.string().max(MAX_ID_LENGTH),
  rule_uuid: z.string().max(MAX_ID_LENGTH),
  rule_name: z.string().max(MAX_RULE_NAME_LENGTH),
  stream_name: z.string().max(MAX_ID_LENGTH).optional(),
  change_point_type: z
    .enum(CHANGE_POINT_TYPES)
    .describe(
      'Change point type detected by the alerting rule. ' +
        '"spike" = Sudden increase in alert volume | Load surge, cascading failure, noisy rule. **Escalation.**; ' +
        '"dip" = Sudden decrease in alert volume | Service down (no data to alert on), rule disabled, data pipeline failure. **Escalation** — a drop to silence usually means the service went DOWN, not that it recovered. ' +
        '"step_change" = Sustained level shift | Config change, new deployment, capacity change. **Direction decides:** a shift up is an escalation; a shift back down toward low volume is a recovery. ' +
        '"trend_change" = Gradual directional shift | Growing workload, degrading performance, slow leak. **Direction decides:** an upward trend is an escalation; a downward trend toward low volume is a recovery. ' +
        '"distribution_change" = Overall distribution shifted | Mixed traffic pattern change, deployment rollout. Escalation unless the shift is clearly back toward baseline.' +
        '"non_stationary" = No discrete change point, but not stationary | Gradual drift, chronic instability — weak signal. ' +
        '"stationary" = The alert rate is flat — no recent change up or down | Steady state. Steady is **not** benign: a stationary rule can be an ongoing failure holding a flat rate. Confirm with a query (signature query if no exact-match KI) and score severity from the **evidence and user impact**, never from the shape or the raw `alert_count`. When observed **after a prior escalation** on the same rule, treat as candidate recovery (confirm with a recovery-lens query).'
    ),
  p_value: z
    .number()
    .describe(
      'Statistical p_value of the change point detection. Lower values indicate stronger signal. ' +
        '≤0.05: credible signal — proceed with full investigation. ' +
        '0.05–0.10: weak signal — require KI backing or confirming failure rows before escalating. ' +
        '>0.10: low credibility — likely noise; do not promote without strong corroborating evidence.'
    ),
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
