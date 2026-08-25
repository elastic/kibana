/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suppressionEpisodeKey } from '../steps/utils/suppression_key';
import type { ActionGroup, AlertEpisode } from '../types';

// Memoizes unmatchedFrom per (plan, dispatchable reference): StoreActionsStep and
// StoreExecutionHistoryStep both derive the unmatched set from the same triage
// within a tick. Kept outside the instance so jest structural equality is unaffected.
const unmatchedCache = new WeakMap<
  DispatchPlan,
  { source: readonly AlertEpisode[]; result: readonly AlertEpisode[] }
>();

/**
 * The final delivery decision (ApplyThrottlingStep): action groups eligible to
 * dispatch now vs groups held back by throttling.
 */
export class DispatchPlan {
  private constructor(
    public readonly toDispatch: readonly ActionGroup[],
    public readonly throttled: readonly ActionGroup[]
  ) {}

  public static of({
    toDispatch,
    throttled,
  }: {
    toDispatch: readonly ActionGroup[];
    throttled: readonly ActionGroup[];
  }): DispatchPlan {
    return new DispatchPlan(toDispatch, throttled);
  }

  public static empty(): DispatchPlan {
    return new DispatchPlan([], []);
  }

  public isEmpty(): boolean {
    return this.toDispatch.length === 0 && this.throttled.length === 0;
  }

  public dispatchEpisodeCount(): number {
    return countEpisodes(this.toDispatch);
  }

  public throttledEpisodeCount(): number {
    return countEpisodes(this.throttled);
  }

  /**
   * Episodes that survived triage but landed in no group — neither dispatched
   * nor throttled. They matched no enabled action policy.
   */
  public unmatchedFrom(dispatchable: readonly AlertEpisode[]): readonly AlertEpisode[] {
    const cached = unmatchedCache.get(this);
    if (cached && cached.source === dispatchable) {
      return cached.result;
    }

    const handledEpisodeKeys = new Set<string>();
    for (const group of [...this.toDispatch, ...this.throttled]) {
      for (const episode of group.episodes) {
        handledEpisodeKeys.add(suppressionEpisodeKey(episode));
      }
    }
    const result = dispatchable.filter((ep) => !handledEpisodeKeys.has(suppressionEpisodeKey(ep)));

    unmatchedCache.set(this, { source: dispatchable, result });
    return result;
  }
}

function countEpisodes(groups: readonly ActionGroup[]): number {
  return groups.reduce((count, group) => count + group.episodes.length, 0);
}
