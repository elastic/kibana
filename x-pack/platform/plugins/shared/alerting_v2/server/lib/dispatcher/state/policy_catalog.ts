/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicy, ActionPolicyId } from '../types';

/** Enabled action policies loaded for this tick, keyed by policy id (FetchPoliciesStep). */
export class PolicyCatalog {
  private constructor(
    public readonly byId: ReadonlyMap<ActionPolicyId, ActionPolicy>,
    private readonly bySpace: ReadonlyMap<string, ActionPolicy[]>
  ) {}

  public static of(policies: ReadonlyMap<ActionPolicyId, ActionPolicy>): PolicyCatalog {
    return new PolicyCatalog(
      policies,
      Map.groupBy(policies.values(), (policy) => policy.spaceId)
    );
  }

  public static empty(): PolicyCatalog {
    return PolicyCatalog.of(new Map());
  }

  public get(id: ActionPolicyId): ActionPolicy | undefined {
    return this.byId.get(id);
  }

  public inSpace(spaceId: string): readonly ActionPolicy[] {
    return this.bySpace.get(spaceId) ?? [];
  }

  /** Grouping mode of the policy; absent policy or mode falls back to `per_episode`. */
  public groupingModeOf(id: ActionPolicyId): NonNullable<ActionPolicy['groupingMode']> {
    return this.byId.get(id)?.groupingMode ?? 'per_episode';
  }

  public apiKeyOf(id: ActionPolicyId): string | undefined {
    return this.byId.get(id)?.apiKey;
  }
}
