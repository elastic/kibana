/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExistingSecretRefs } from './secret_refs';

interface RunWithSharedSecretsOptions<TItem, TResult> {
  items: TItem[];
  /** True when the user typed credentials that Fleet will turn into new secrets. */
  hasTypedSecrets: boolean;
  /**
   * Refs of secrets that already exist and should be used by every item (for example the ones a
   * dirty update just created); typed credentials are not sent when they are given.
   */
  initialRefs?: ExistingSecretRefs;
  /**
   * Creates or updates one policy. `sharedRefs` is defined when the policy must use those refs
   * instead of the typed credentials (the typed ones were already stored by an earlier policy).
   */
  run: (item: TItem, sharedRefs: ExistingSecretRefs | undefined) => Promise<TResult>;
  /** The policy id a finished run produced, so its stored refs can be read back. */
  getPolicyId: (item: TItem, result: TResult) => string | undefined;
  fetchRefs: (policyId: string) => Promise<ExistingSecretRefs>;
}

/**
 * Fleet turns every typed credential into a new secret, so sending the same typed keys to N
 * policies creates N secrets. This runs the first item with the typed credentials, reads the refs
 * Fleet stored for it, and runs the remaining items with those refs, so the whole set shares one
 * secret per credential. Results are in item order.
 *
 * When the first item fails there are no refs to share; the rest still run on their own (sharing
 * among themselves) rather than being blocked by one failure.
 */
export async function runWithSharedSecrets<TItem, TResult>({
  items,
  hasTypedSecrets,
  initialRefs,
  run,
  getPolicyId,
  fetchRefs,
}: RunWithSharedSecretsOptions<TItem, TResult>): Promise<{
  results: Array<PromiseSettledResult<TResult>>;
  /** Refs created by this run for the typed credentials, when it created any. */
  sharedRefs: ExistingSecretRefs | undefined;
}> {
  if (initialRefs && initialRefs.size > 0) {
    return {
      results: await Promise.allSettled(items.map((item) => run(item, initialRefs))),
      sharedRefs: initialRefs,
    };
  }
  if (!hasTypedSecrets || items.length === 0) {
    return {
      results: await Promise.allSettled(items.map((item) => run(item, undefined))),
      sharedRefs: undefined,
    };
  }

  const [first, ...rest] = items;
  const [firstResult] = await Promise.allSettled([run(first, undefined)]);
  let sharedRefs: ExistingSecretRefs | undefined;
  if (firstResult.status === 'fulfilled') {
    const policyId = getPolicyId(first, firstResult.value);
    if (policyId) {
      const refs = await fetchRefs(policyId);
      if (refs.size > 0) sharedRefs = refs;
    }
  }

  if (rest.length === 0) return { results: [firstResult], sharedRefs };
  if (sharedRefs) {
    const restResults = await Promise.allSettled(rest.map((item) => run(item, sharedRefs)));
    return { results: [firstResult, ...restResults], sharedRefs };
  }
  // Nothing to share: the first run failed or its refs could not be read.
  const restRun = await runWithSharedSecrets({
    items: rest,
    hasTypedSecrets,
    run,
    getPolicyId,
    fetchRefs,
  });
  return { results: [firstResult, ...restRun.results], sharedRefs: restRun.sharedRefs };
}
