/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suppressionAlertKey } from '../steps/utils/suppression_key';
import type { ActionGroup, Alert } from '../types';

/**
 * The final delivery decision (ApplyThrottlingStep): action groups eligible to
 * dispatch now, groups held back by throttling, alerts an earlier tick already
 * delivered, and the dispatchable alerts that landed in no group at all.
 */
export class DispatchPlan {
  private static readonly EMPTY = new DispatchPlan([], [], [], []);

  private constructor(
    public readonly toDispatch: readonly ActionGroup[],
    public readonly throttled: readonly ActionGroup[],
    /** Groups narrowed to the alerts an earlier tick already delivered. */
    public readonly alreadyNotified: readonly ActionGroup[],
    /** Alerts that survived triage but matched no enabled action policy. */
    public readonly unmatched: readonly Alert[]
  ) {}

  public static of({
    toDispatch,
    throttled,
    alreadyNotified = [],
    dispatchable,
  }: {
    toDispatch: readonly ActionGroup[];
    throttled: readonly ActionGroup[];
    alreadyNotified?: readonly ActionGroup[];
    /** Dispatchable alerts the plan was built from; those in no group become `unmatched`. */
    dispatchable: readonly Alert[];
  }): DispatchPlan {
    return new DispatchPlan(
      toDispatch,
      throttled,
      alreadyNotified,
      deriveUnmatched([toDispatch, throttled, alreadyNotified], dispatchable)
    );
  }

  public static empty(): DispatchPlan {
    return DispatchPlan.EMPTY;
  }

  public isEmpty(): boolean {
    return (
      this.toDispatch.length === 0 &&
      this.throttled.length === 0 &&
      this.alreadyNotified.length === 0
    );
  }
}

function deriveUnmatched(
  groupLists: ReadonlyArray<readonly ActionGroup[]>,
  dispatchable: readonly Alert[]
): readonly Alert[] {
  if (groupLists.every((groups) => groups.length === 0)) {
    return dispatchable;
  }

  const handledAlertKeys = new Set<string>();
  for (const groups of groupLists) {
    for (const group of groups) {
      for (const alert of group.alerts) {
        handledAlertKeys.add(suppressionAlertKey(alert));
      }
    }
  }
  return dispatchable.filter((alert) => !handledAlertKeys.has(suppressionAlertKey(alert)));
}
