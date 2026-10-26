/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert, Rule, RuleId } from '../types';

/** Rule metadata fetched for the dispatchable alerts, keyed by rule id (FetchRulesStep). */
export class RuleCatalog {
  private static readonly EMPTY = new RuleCatalog(new Map());

  private constructor(private readonly byId: ReadonlyMap<RuleId, Rule>) {}

  public static of(rules: ReadonlyMap<RuleId, Rule>): RuleCatalog {
    return new RuleCatalog(rules);
  }

  public static empty(): RuleCatalog {
    return RuleCatalog.EMPTY;
  }

  public get size(): number {
    return this.byId.size;
  }

  public get(id: RuleId): Rule | undefined {
    return this.byId.get(id);
  }

  public forAlert(alert: Alert): Rule | undefined {
    return alert.rule_id != null ? this.byId.get(alert.rule_id) : undefined;
  }

  /**
   * Internal alert whose rule is absent (deleted or failed to fetch). Such
   * alerts must never dispatch: catch-all policies would otherwise emit
   * spurious notifications for rules that no longer exist.
   */
  public isOrphanedInternalAlert(alert: Alert): boolean {
    return alert.rule_id != null && !this.byId.has(alert.rule_id);
  }

  public spaceIdOf(id: RuleId): string | undefined {
    return this.byId.get(id)?.spaceId;
  }
}
