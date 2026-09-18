/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suppressionEpisodeKey } from '../steps/utils/suppression_key';
import type { ActionGroup, AlertEpisode } from '../types';

/**
 * The final delivery decision (ApplyThrottlingStep): action groups eligible to
 * dispatch now, groups held back by throttling, and the dispatchable episodes
 * that landed in no group at all.
 */
export class DispatchPlan {
  private static readonly EMPTY = new DispatchPlan([], [], []);

  private constructor(
    public readonly toDispatch: readonly ActionGroup[],
    public readonly throttled: readonly ActionGroup[],
    /** Episodes that survived triage but matched no enabled action policy. */
    public readonly unmatched: readonly AlertEpisode[]
  ) {}

  public static of({
    toDispatch,
    throttled,
    dispatchable,
  }: {
    toDispatch: readonly ActionGroup[];
    throttled: readonly ActionGroup[];
    /** Dispatchable episodes the plan was built from; those in no group become `unmatched`. */
    dispatchable: readonly AlertEpisode[];
  }): DispatchPlan {
    return new DispatchPlan(
      toDispatch,
      throttled,
      deriveUnmatched(toDispatch, throttled, dispatchable)
    );
  }

  public static empty(): DispatchPlan {
    return DispatchPlan.EMPTY;
  }

  public isEmpty(): boolean {
    return this.toDispatch.length === 0 && this.throttled.length === 0;
  }
}

function deriveUnmatched(
  toDispatch: readonly ActionGroup[],
  throttled: readonly ActionGroup[],
  dispatchable: readonly AlertEpisode[]
): readonly AlertEpisode[] {
  if (toDispatch.length === 0 && throttled.length === 0) {
    return dispatchable;
  }

  const handledEpisodeKeys = new Set<string>();
  for (const groups of [toDispatch, throttled]) {
    for (const group of groups) {
      for (const episode of group.episodes) {
        handledEpisodeKeys.add(suppressionEpisodeKey(episode));
      }
    }
  }
  return dispatchable.filter((episode) => !handledEpisodeKeys.has(suppressionEpisodeKey(episode)));
}
