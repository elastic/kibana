/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z, isoDateTime } from '@kbn/zod/v4';
import dedent from 'dedent';
import { MAX_ID_LENGTH, MAX_RULE_NAME_LENGTH, MAX_TITLE_LENGTH } from '../constants';

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

/** The outcome of re-running a rule's stored query when the classifier looked at a detection. */
export const PROBE_STATUSES = ['ok', 'error', 'timeout', 'no_query', 'aborted'] as const;
export type ProbeStatus = (typeof PROBE_STATUSES)[number];

/** Whether a detection's match count is above the rule's own normal. */
const BASELINE_DECISIONS = ['above_normal', 'background', 'warming_up'] as const;
export type BaselineDecision = (typeof BASELINE_DECISIONS)[number];

/** Why a detection is skipped: nothing changed since the stored verdict. */
export const SKIP_REASONS = ['still_breaching', 'still_healthy'] as const;

/**
 * Why a detection reaches the agent. `state_changed`: the probe contradicts a stored verdict.
 * `probe_unavailable`: the probe could not run; `probe_status` says why.
 */
export const NEEDS_AGENT_REASONS = [
  'state_changed',
  'probe_unavailable',
  'unjudged_member',
  'not_live_member',
  'member_joining',
  'series_too_old',
  'above_normal',
  'flaky_probe',
  'over_cap',
] as const;

export type SkipReason = (typeof SKIP_REASONS)[number];
export type NeedsAgentReason = (typeof NEEDS_AGENT_REASONS)[number];

export const baselineObservationSchema = lazySchema(() =>
  z.object({
    decision: z.enum(BASELINE_DECISIONS),
    /** The latest complete bucket. */
    value: z.number(),
    samples: z.number().int().min(0),
    median: z.number().optional(),
    threshold: z.number().optional(),
  })
);
export type BaselineObservation = z.infer<typeof baselineObservationSchema>;

/**
 * Why the classifier closed a detection without the discovery agent: its decision for the rule, the
 * probe that backed it and the baseline it observed. Stored on the detection's processed marker, so
 * `checked_at` is the marker's timestamp and is only present on reads. `reason` is read as a plain
 * string so a marker written with a reason that has since been renamed still shows; the write side
 * validates it.
 */
export const detectionSkipSchema = lazySchema(() =>
  z.object({
    reason: z.string().max(64),
    probe_status: z.enum(PROBE_STATUSES).optional(),
    /** Whether the re-run stored query returned rows, and over how many minutes it looked back. */
    probe_has_rows: z.boolean().optional(),
    probe_window_minutes: z.number().int().min(0).optional(),
    baseline: baselineObservationSchema.optional(),
    /** The live event whose stored verdict for the rule the skip rests on. */
    event_id: z.string().max(MAX_ID_LENGTH).optional(),
    event_title: z.string().max(MAX_TITLE_LENGTH).optional(),
    stored_verdict: z.string().max(32).optional(),
    checked_at: isoDateTime({ offset: true }).optional(),
  })
);

export type DetectionSkip = z.infer<typeof detectionSkipSchema>;

/** A skip as it is written to a processed marker: a known reason, and the event it rests on. */
export const skipMarkerSchema = lazySchema(() =>
  detectionSkipSchema.omit({ checked_at: true }).extend({
    reason: z.enum(SKIP_REASONS),
    event_id: z.string().min(1).max(MAX_ID_LENGTH),
  })
);

export type SkipMarker = z.infer<typeof skipMarkerSchema>;

/**
 * Detection — an immutable change-point observation. `change_point_type` and
 * `p_value` are top-level (no nested `detection_evidence`). `processed` is derived
 * at read time from the presence of a processed marker (see `processedMarkerSchema`)
 * and is never stored on the detection.
 */
export const detectionSchema = lazySchema(() =>
  z.object({
    '@timestamp': isoDateTime({ offset: true }),
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
    source_id: z.string().max(MAX_ID_LENGTH),
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
    // Derived at read time from the processed marker; set when the classifier closed the detection.
    skip: detectionSkipSchema.optional(),
  })
);

export type Detection = z.infer<typeof detectionSchema>;
