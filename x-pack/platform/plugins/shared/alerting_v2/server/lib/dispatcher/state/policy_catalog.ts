/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_GROUPING_MODE } from '../constants';
import type { ActionPolicy, ActionPolicyId } from '../types';

const NO_POLICIES: readonly ActionPolicy[] = [];

/** Enabled action policies loaded for this tick, keyed by policy id (FetchPoliciesStep). */
export class PolicyCatalog {
  private static readonly EMPTY = new PolicyCatalog(new Map(), new Map());

  private constructor(
    private readonly byId: ReadonlyMap<ActionPolicyId, ActionPolicy>,
    private readonly bySpace: ReadonlyMap<string, ActionPolicy[]>
  ) {}

  public static of(policies: ReadonlyMap<ActionPolicyId, ActionPolicy>): PolicyCatalog {
    return new PolicyCatalog(
      policies,
      Map.groupBy(policies.values(), (policy) => policy.spaceId)
    );
  }

  public static empty(): PolicyCatalog {
    return PolicyCatalog.EMPTY;
  }

  public get size(): number {
    return this.byId.size;
  }

  public get(id: ActionPolicyId): ActionPolicy | undefined {
    return this.byId.get(id);
  }

  public inSpace(spaceId: string): readonly ActionPolicy[] {
    return this.bySpace.get(spaceId) ?? NO_POLICIES;
  }

  /** Grouping mode of the policy; a policy missing from the catalog falls back to the default. */
  public groupingModeOf(id: ActionPolicyId): ActionPolicy['groupingMode'] {
    return this.byId.get(id)?.groupingMode ?? DEFAULT_GROUPING_MODE;
  }

  public apiKeyOf(id: ActionPolicyId): string | undefined {
    return this.byId.get(id)?.apiKey;
  }
}
