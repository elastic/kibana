/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLICY_VERSION_SEPARATOR } from '../constants';

export function hasVersionSuffix(policyId: string): boolean {
  if (!policyId) {
    return false;
  }
  // policy ends with version suffix e.g. 'policy123#9.2'
  return Boolean(policyId.match(/#\d+\.\d+$/));
}

export function splitVersionSuffixFromPolicyId(policyId: string): {
  baseId: string;
  version: string | null;
} {
  if (!hasVersionSuffix(policyId)) {
    return { baseId: policyId, version: null };
  }
  const separatorIndex = policyId.lastIndexOf(AGENT_POLICY_VERSION_SEPARATOR);
  const baseId = policyId.slice(0, separatorIndex);
  const version = policyId.slice(separatorIndex + 1);
  return { baseId, version };
}

export function removeVersionSuffixFromPolicyId(policyId: string): string {
  return splitVersionSuffixFromPolicyId(policyId).baseId;
}
