/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { DEFAULT_GROUPING } from '../constants';
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
  public groupingModeOf(id: ActionPolicyId): ActionPolicy['grouping']['mode'] {
    return this.byId.get(id)?.grouping.mode ?? DEFAULT_GROUPING.mode;
  }

  /** Throttle strategy in effect for the policy, including the default its grouping mode implies. */
  public throttleStrategyOf(id: ActionPolicyId): ThrottleStrategy {
    const policy = this.byId.get(id);
    return policy
      ? resolveThrottleStrategy(policy)
      : defaultThrottleStrategy(DEFAULT_GROUPING.mode);
  }

  public apiKeyOf(id: ActionPolicyId): string | undefined {
    return this.byId.get(id)?.apiKey;
  }
}

const defaultThrottleStrategy = (mode: ActionPolicy['grouping']['mode']): ThrottleStrategy =>
  mode === 'per_alert' ? 'on_status_change' : 'time_interval';

/** The throttle strategy of the policy, or the default its grouping mode implies when it sets none. */
export const resolveThrottleStrategy = (policy: ActionPolicy): ThrottleStrategy =>
  policy.throttle?.strategy ?? defaultThrottleStrategy(policy.grouping.mode);
