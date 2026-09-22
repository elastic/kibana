/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput, PackagePolicyConfigRecord } from '../../../common/types';

// Two names are in use in AWS packages: the CSPM/Asset-Discovery form (`aws.role_arn`) and the
// direct form (`role_arn`). Both appear at package-policy level, input level, and stream level.
// Rewriting only the keys that already exist keeps this a safe operation on any policy.
const ROLE_ARN_KEYS = ['role_arn', 'aws.role_arn'] as const;

const varsHasRoleArnKey = (vars: PackagePolicyConfigRecord | undefined): boolean =>
  Boolean(vars && ROLE_ARN_KEYS.some((key) => vars[key] !== undefined));

const rewriteVars = (
  vars: PackagePolicyConfigRecord | undefined,
  newValue: string
): { vars: PackagePolicyConfigRecord | undefined; changed: boolean } => {
  if (!vars) return { vars, changed: false };
  let changed = false;
  let next: PackagePolicyConfigRecord | undefined;
  for (const key of ROLE_ARN_KEYS) {
    const entry = vars[key];
    if (!entry || entry.value === newValue) continue;
    if (!next) next = { ...vars };
    next[key] = { ...entry, value: newValue };
    changed = true;
  }
  return { vars: changed && next ? next : vars, changed };
};

const rewriteInputs = <T extends NewPackagePolicyInput>(
  inputs: T[],
  newValue: string
): { inputs: T[]; changed: boolean } => {
  let changed = false;
  const updated = inputs.map((input) => {
    const inputVarsResult = rewriteVars(input.vars, newValue);
    const inputChanged = inputVarsResult.changed;
    let streamsChanged = false;
    const streams = input.streams?.map((stream) => {
      const streamVarsResult = rewriteVars(stream.vars, newValue);
      if (!streamVarsResult.changed) return stream;
      streamsChanged = true;
      return { ...stream, vars: streamVarsResult.vars };
    });
    if (!inputChanged && !streamsChanged) return input;
    changed = true;
    return {
      ...input,
      ...(inputChanged ? { vars: inputVarsResult.vars } : {}),
      ...(streamsChanged ? { streams } : {}),
    };
  });
  return changed ? { inputs: updated, changed } : { inputs, changed };
};

export interface RewritePolicyRoleArnPolicy {
  vars?: PackagePolicyConfigRecord;
  inputs: NewPackagePolicyInput[];
}

export interface RewritePolicyRoleArnResult<T extends RewritePolicyRoleArnPolicy> {
  vars: T['vars'];
  inputs: T['inputs'];
  changed: boolean;
}

/**
 * Rewrite every `role_arn` / `aws.role_arn` occurrence in a package policy to `newValue`. Covers
 * three shapes seen across AWS-family packages:
 *  - top-level `packagePolicy.vars` (shared package vars — used by the `aws` package)
 *  - `input.vars` (input-level — used by CSPM / Asset-Discovery)
 *  - `stream.vars` (per-stream)
 *
 * Returns `changed: false` and the original refs when nothing needed to change; otherwise returns
 * fresh objects for the paths that changed (structural sharing everywhere else).
 */
export const rewritePolicyRoleArn = <T extends RewritePolicyRoleArnPolicy>(
  policy: T,
  newValue: string
): RewritePolicyRoleArnResult<T> => {
  const varsResult = rewriteVars(policy.vars, newValue);
  const inputsResult = rewriteInputs(policy.inputs, newValue);
  return {
    vars: (varsResult.changed ? varsResult.vars : policy.vars) as T['vars'],
    inputs: (inputsResult.changed ? inputsResult.inputs : policy.inputs) as T['inputs'],
    changed: varsResult.changed || inputsResult.changed,
  };
};

/** True when the policy has at least one `role_arn` / `aws.role_arn` field at any level. */
export const policyHasRoleArnFields = (policy: RewritePolicyRoleArnPolicy): boolean => {
  if (varsHasRoleArnKey(policy.vars)) {
    return true;
  }
  for (const input of policy.inputs) {
    if (varsHasRoleArnKey(input.vars)) {
      return true;
    }
    for (const stream of input.streams ?? []) {
      if (varsHasRoleArnKey(stream.vars)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * True when every `role_arn` / `aws.role_arn` on the policy equals `arn`, and at least one such
 * field exists. Distinct from `!rewritePolicyRoleArn(...).changed`, which is also true when the
 * policy has no Role ARN fields at all (a concurrent edit that removed them).
 */
export const policyHoldsRoleArn = (policy: RewritePolicyRoleArnPolicy, arn: string): boolean =>
  policyHasRoleArnFields(policy) && !rewritePolicyRoleArn(policy, arn).changed;
