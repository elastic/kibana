/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode, Rule, RuleId } from '../types';

/** Rule metadata fetched for the dispatchable episodes, keyed by rule id (FetchRulesStep). */
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

  public forEpisode(episode: AlertEpisode): Rule | undefined {
    return episode.rule_id != null ? this.byId.get(episode.rule_id) : undefined;
  }

  /**
   * Internal episode whose rule is absent (deleted or failed to fetch). Such
   * episodes must never dispatch: catch-all policies would otherwise emit
   * spurious notifications for rules that no longer exist.
   */
  public isOrphanedInternalEpisode(episode: AlertEpisode): boolean {
    return episode.rule_id != null && !this.byId.has(episode.rule_id);
  }

  public spaceIdOf(id: RuleId): string | undefined {
    return this.byId.get(id)?.spaceId;
  }
}
