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
// sha256, hex encoded
export const TAIL_SAMPLING_HASH_LENGTH = 64;

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

export interface TailSamplingDiagnostic {
  code: string;
  message: string;
  // Position of the policy in the list, when the diagnostic is about one policy.
  policyIndex?: number;
  policyName?: string;
  // Path inside the policy, for example ['latency', 'threshold_ms'].
  path?: Array<string | number>;
}

export interface ManagedTailSamplingResponse {
  // False until a policy set has been saved once. The page shows its empty state.
  saved: boolean;
  enabled: boolean;
  policies: TailSamplingPolicy[];
  hash: string | null;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ValidateManagedTailSamplingResponse {
  valid: boolean;
  diagnostics: TailSamplingDiagnostic[];
  // Hash of the policies as validated. Send it back as `validatedHash` on save.
  hash: string;
}
