/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput, PackagePolicyConfigRecord } from '../../../common/types';

// Two names are in use in AWS packages: the CSPM/Asset-Discovery form (`aws.role_arn`) and the
// direct form (`role_arn`). Both appear at input-level and stream-level. Rewriting only the keys
// that already exist keeps this a safe operation on any policy.
const ROLE_ARN_KEYS = ['role_arn', 'aws.role_arn'] as const;

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

export interface UpdateInputsWithRoleArnResult<T> {
  updated: T[];
  changed: boolean;
}

/**
 * Rewrite every `role_arn` / `aws.role_arn` occurrence in a package policy's `inputs` (input-
 * level and per-stream) to `newValue`. Returns the original inputs and `changed: false` if
 * nothing needed to change; otherwise returns a fresh array (structural sharing where safe).
 */
export const updateInputsWithRoleArn = <T extends NewPackagePolicyInput>(
  inputs: T[],
  newValue: string
): UpdateInputsWithRoleArnResult<T> => {
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
  return changed ? { updated, changed } : { updated: inputs, changed };
};
