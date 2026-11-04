/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { sendGetAgentlessPolicy, sendGetOnePackagePolicy } from '@kbn/fleet-plugin/public';

/** A var value that points at a secret already stored by Fleet. */
export interface SecretRefValue {
  isSecretRef: true;
  id: string;
}

/** Credential var name → the secret ref Fleet currently stores for it. */
export type ExistingSecretRefs = ReadonlyMap<string, SecretRefValue>;

/** Package vars that hold AWS credentials; the only ones the wizard can keep instead of re-ask. */
export const CREDENTIAL_VAR_NAMES = [
  'access_key_id',
  'secret_access_key',
  'session_token',
] as const;
export type CredentialVarName = (typeof CREDENTIAL_VAR_NAMES)[number];

const NO_REFS: ExistingSecretRefs = new Map();

const isSecretRef = (value: unknown): value is SecretRefValue =>
  typeof value === 'object' &&
  value !== null &&
  (value as { isSecretRef?: unknown }).isSecretRef === true &&
  typeof (value as { id?: unknown }).id === 'string';

type VarsRecord = Record<string, unknown> | undefined;

interface PolicyNode {
  vars?: VarsRecord;
  inputs?: Record<string, PolicyNode> | PolicyNode[];
  streams?: Record<string, PolicyNode> | PolicyNode[];
}

function collectRefs(vars: VarsRecord, into: Map<string, SecretRefValue>) {
  for (const name of CREDENTIAL_VAR_NAMES) {
    if (into.has(name)) continue;
    const entry = vars?.[name];
    // Full package policies wrap the value ({ value }); simplified/agentless ones do not.
    const value = isSecretRef(entry) ? entry : (entry as { value?: unknown } | undefined)?.value;
    if (isSecretRef(value)) into.set(name, value);
  }
}

/**
 * Credential vars of a policy that are stored as secret refs. Accepts both the full package-policy
 * shape (`vars[name].value`, arrays of inputs/streams) and the simplified agentless shape
 * (`vars[name]`, inputs/streams keyed by id). Package-level vars win over input and stream vars.
 */
export function detectSecretRefs(policy: object | undefined): ExistingSecretRefs {
  if (!policy) return NO_REFS;
  const refs = new Map<string, SecretRefValue>();
  const visit = (node: PolicyNode) => {
    collectRefs(node.vars, refs);
    for (const child of [node.inputs, node.streams]) {
      if (child) Object.values(child).forEach(visit);
    }
  };
  visit(policy as PolicyNode);
  return refs.size > 0 ? refs : NO_REFS;
}

/**
 * Drops the refs a credential method does not use, so switching method on resume (temporary keys
 * to static keys) does not carry the old method's `session_token` into the new policy.
 */
export function filterSecretRefsForMethod(
  refs: ExistingSecretRefs,
  method: 'static_keys' | 'temporary_keys'
): ExistingSecretRefs {
  if (method === 'temporary_keys') return refs;
  return new Map([...refs].filter(([name]) => name !== 'session_token'));
}

/**
 * Blanks the typed credentials the refs already cover, so Fleet does not store them again, and
 * keeps the typed value of every credential without a ref (a package may declare only some of its
 * credential vars as secrets).
 */
export function withoutCoveredCredentials<T extends Partial<Record<CredentialVarName, string>>>(
  credentials: T,
  refs: ExistingSecretRefs
): T {
  const result = { ...credentials };
  for (const name of CREDENTIAL_VAR_NAMES) {
    if (name in result && refs.has(name)) result[name] = '' as T[CredentialVarName];
  }
  return result;
}

/** Fresh secret refs of one deployed managed-integration (agentless) policy; none when unreadable. */
export async function fetchAgentlessSecretRefs(policyId: string | undefined) {
  if (!policyId) return NO_REFS;
  try {
    const response = await sendGetAgentlessPolicy(policyId);
    return detectSecretRefs(response.item);
  } catch {
    return NO_REFS;
  }
}

/** Fresh secret refs of one deployed agent-based package policy; none when unreadable. */
export async function fetchPackagePolicySecretRefs(policyId: string | undefined) {
  if (!policyId) return NO_REFS;
  try {
    const response = await sendGetOnePackagePolicy(policyId);
    return detectSecretRefs(response.data?.item);
  } catch {
    return NO_REFS;
  }
}

/**
 * Secret refs of the first deployed policy, for the credential form. All policies of one
 * deployment share the same credentials, so one is enough. A failed fetch is treated as "nothing
 * stored": the user is simply asked for the credentials again.
 */
export function useExistingSecretRefs(
  policyId: string | undefined,
  fetchRefs: (policyId: string | undefined) => Promise<ExistingSecretRefs>
): { existingSecretRefs: ExistingSecretRefs; isLoading: boolean } {
  const [state, setState] = useState<{ policyId?: string; refs: ExistingSecretRefs }>({
    refs: NO_REFS,
  });

  useEffect(() => {
    if (!policyId) return;
    let cancelled = false;
    fetchRefs(policyId)
      .then((refs) => {
        if (!cancelled) setState({ policyId, refs });
      })
      // Nothing stored is the safe answer: without it a rejected lookup would leave the form
      // loading forever.
      .catch(() => {
        if (!cancelled) setState({ policyId, refs: NO_REFS });
      });
    return () => {
      cancelled = true;
    };
  }, [policyId, fetchRefs]);

  if (!policyId) return { existingSecretRefs: NO_REFS, isLoading: false };
  return { existingSecretRefs: state.refs, isLoading: state.policyId !== policyId };
}
