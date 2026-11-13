/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';

export const MAX_TAIL_SAMPLING_POLICIES = 100;
export const MAX_TAIL_SAMPLING_POLICY_NAME_LENGTH = 256;
export const MAX_TAIL_SAMPLING_POLICY_TYPE_LENGTH = 64;
// Whether the hash comes from Kibana or the control API is still open, so only bound it.
export const MAX_TAIL_SAMPLING_HASH_LENGTH = 128;
// Saved object versions are short opaque strings, such as 'WzEsMV0='.
export const MAX_TAIL_SAMPLING_VERSION_LENGTH = 128;

/**
 * The tail-sampling processors Kibana accepts. A project uses exactly one at a time.
 * Uses the collector's own names. 'adaptive_tail_sampling' may follow later.
 */
export const TAIL_SAMPLING_PROCESSOR = 'tail_sampling';
export type TailSamplingProcessor = typeof TAIL_SAMPLING_PROCESSOR;

/**
 * One policy of the upstream OpenTelemetry `tail_sampling` processor, for example
 * `{ name: 'keep-errors', type: 'status_code', status_code: { status_codes: ['ERROR'] } }`.
 *
 * The route only checks this outer shape. The block for each `type` is checked by the
 * policy validator in the handler, so `_validate` can return diagnostics instead of a 400.
 */
export interface TailSamplingPolicy {
  name: string;
  type: string;
  [block: string]: unknown;
}

export const tailSamplingPolicySchema = z.looseObject({
  name: z.string().max(MAX_TAIL_SAMPLING_POLICY_NAME_LENGTH),
  type: z.string().max(MAX_TAIL_SAMPLING_POLICY_TYPE_LENGTH),
});

export const tailSamplingPoliciesSchema = z
  .array(tailSamplingPolicySchema)
  .max(MAX_TAIL_SAMPLING_POLICIES);

/** The config of the `tail_sampling` processor. */
export interface TailSamplingConfig {
  policies: TailSamplingPolicy[];
}

/**
 * The processor and its config, as sent to `_validate` and `PUT`. A second processor
 * would turn this into a union keyed on `processor`.
 */
export const tailSamplingSettingsSchema = z.object({
  processor: z.literal(TAIL_SAMPLING_PROCESSOR),
  config: z.object({ policies: tailSamplingPoliciesSchema }),
});

// Policy types that are accepted but produce a warning.
export const TAIL_SAMPLING_POLICY_TYPES_WITH_WARNING: ReadonlySet<string> = new Set([
  'rate_limiting',
  'bytes_limiting',
  'composite',
]);

export const TAIL_SAMPLING_WARNING_CODES = {
  // A policy of a type in TAIL_SAMPLING_POLICY_TYPES_WITH_WARNING, at any depth.
  RATE_LIMIT_PER_REPLICA: 'rate_limit_per_replica',
  // The policy set drops client or producer spans, so the service map loses connections.
  EXIT_SPANS_DROPPED: 'exit_spans_dropped',
} as const;

export type TailSamplingWarningCode =
  (typeof TAIL_SAMPLING_WARNING_CODES)[keyof typeof TAIL_SAMPLING_WARNING_CODES];

/** An error. Errors make the config invalid. */
export interface TailSamplingDiagnostic {
  code: string;
  message: string;
  // Position of the policy in the list, when the diagnostic is about one policy.
  policyIndex?: number;
  policyName?: string;
  // Path inside the policy, for example ['latency', 'threshold_ms'].
  path?: Array<string | number>;
}

/** A warning. Warnings never make the config invalid, and it can still be saved. */
export interface TailSamplingWarning extends TailSamplingDiagnostic {
  code: TailSamplingWarningCode;
}

export interface TailSamplingResponse {
  // False until a config has been saved once. The page shows its empty state.
  saved: boolean;
  enabled: boolean;
  processor: TailSamplingProcessor;
  config: TailSamplingConfig;
  hash: string | null;
  // Version of the stored document. Send it back on save to detect concurrent edits.
  version?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ValidateTailSamplingResponse {
  // False only when there are errors. Warnings do not affect it.
  valid: boolean;
  diagnostics: TailSamplingDiagnostic[];
  // Non-blocking. A warning about one policy sets `policyIndex`, a set-level one does not.
  warnings: TailSamplingWarning[];
  // Hash of the config as validated. Send it back as `validatedHash` on save.
  hash: string;
}
