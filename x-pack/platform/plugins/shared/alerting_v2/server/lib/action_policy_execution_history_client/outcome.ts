/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyExecutionOutcome } from '@kbn/alerting-v2-schemas';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  type ActionPolicyEventAction,
} from '../dispatcher/steps/constants';

/**
 * Translation between the stored `event.action` vocabulary the dispatcher
 * writes and the outcome vocabulary the API speaks. Events already in the data
 * stream keep their original action, so the projection happens on read.
 */
const EVENT_ACTION_BY_OUTCOME = {
  success: ACTION_POLICY_EVENT_ACTIONS.DISPATCHED,
  throttled: ACTION_POLICY_EVENT_ACTIONS.THROTTLED,
  failure: ACTION_POLICY_EVENT_ACTIONS.DISPATCH_FAILED,
} as const satisfies Record<PolicyExecutionOutcome, ActionPolicyEventAction>;

/**
 * The `event.action` values the execution history API surfaces. `unmatched` is
 * absent on purpose: the dispatcher writes it, but it is not a dispatch outcome.
 */
export type SurfacedEventAction = (typeof EVENT_ACTION_BY_OUTCOME)[PolicyExecutionOutcome];

const OUTCOME_BY_EVENT_ACTION = {
  [ACTION_POLICY_EVENT_ACTIONS.DISPATCHED]: 'success',
  [ACTION_POLICY_EVENT_ACTIONS.THROTTLED]: 'throttled',
  [ACTION_POLICY_EVENT_ACTIONS.DISPATCH_FAILED]: 'failure',
} as const satisfies Record<SurfacedEventAction, PolicyExecutionOutcome>;

export const ALL_SURFACED_EVENT_ACTIONS: SurfacedEventAction[] =
  Object.values(EVENT_ACTION_BY_OUTCOME);

export const isSurfacedEventAction = (action: unknown): action is SurfacedEventAction =>
  typeof action === 'string' && Object.hasOwn(OUTCOME_BY_EVENT_ACTION, action);

/** Projects a stored `event.action` onto the outcome the API reports. */
export const toPolicyExecutionOutcome = (action: SurfacedEventAction): PolicyExecutionOutcome =>
  OUTCOME_BY_EVENT_ACTION[action];

/** Resolves an outcome filter to the `event.action` values it selects. */
export const toEventActions = (
  outcomes: PolicyExecutionOutcome[] | undefined
): SurfacedEventAction[] | undefined =>
  outcomes && outcomes.length > 0
    ? outcomes.map((outcome) => EVENT_ACTION_BY_OUTCOME[outcome])
    : undefined;
