/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyVersion } from '../../services/action_policy_saved_object_service/action_policy_saved_object_service';
import { savedObjectNamespacesToSpaceId } from '../../space_id_to_namespace';
import type { ActionPolicy, ActionPolicyId } from '../types';

export interface CachedPolicy {
  version?: string;
  policy: ActionPolicy;
}

/** Decrypted action policies reused across ticks while their saved object version is unchanged. */
export class DecryptedPolicyCache {
  private readonly entries = new Map<ActionPolicyId, CachedPolicy>();

  public get size(): number {
    return this.entries.size;
  }

  /** Splits the current policy versions into cached policies and the spaces that need decrypting. */
  public lookup(rows: readonly ActionPolicyVersion[]): {
    cached: CachedPolicy[];
    staleSpaceIds: string[];
  } {
    const hits: CachedPolicy[] = [];
    const staleSpaceIds = new Set<string>();

    for (const { id, version, namespaces } of rows) {
      const entry = this.entries.get(id);
      if (version !== undefined && entry?.version === version) {
        hits.push(entry);
      } else {
        staleSpaceIds.add(savedObjectNamespacesToSpaceId(namespaces));
      }
    }

    return {
      cached: hits.filter(({ policy }) => !staleSpaceIds.has(policy.spaceId)),
      staleSpaceIds: [...staleSpaceIds],
    };
  }

  /** Replaces every cached policy of `spaceIds` with `entries`. */
  public replaceSpaces(spaceIds: readonly string[], entries: readonly CachedPolicy[]): void {
    const replaced = new Set(spaceIds);

    for (const [id, { policy }] of this.entries) {
      if (replaced.has(policy.spaceId)) {
        this.entries.delete(id);
      }
    }

    for (const entry of entries) {
      if (entry.version !== undefined) {
        this.entries.set(entry.policy.id, entry);
      }
    }
  }
}
