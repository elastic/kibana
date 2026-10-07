/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateActionPolicyData,
  ActionPolicyResponse,
  PolicyMatcher,
  UpdateActionPolicyData,
} from '@kbn/alerting-v2-schemas';
import { needsInterval } from '@kbn/alerting-v2-schemas';
import { DEFAULT_STRATEGY_FOR_MODE } from './constants';
import type { ActionPolicyFormState } from './types';

export { needsInterval };

/**
 * Collapses a matcher where both `tags` and `expression` are empty/null back to `null`
 * (catch-all). Prevents persisting `{ tags: null, expression: null }` which would be
 * truthy but semantically equivalent to no matcher.
 */
const normalizeMatcher = (matcher: PolicyMatcher | null): PolicyMatcher | null =>
  matcher && (matcher.tags?.length || matcher.expression?.trim()) ? matcher : null;

/** An interval the strategy cannot use is omitted on create, where `null` is not a clear signal. */
const buildThrottle = (state: ActionPolicyFormState): CreateActionPolicyData['throttle'] => ({
  strategy: state.throttleStrategy,
  ...(needsInterval(state.throttleStrategy) ? { interval: state.throttleInterval } : {}),
});

/** The form always submits the throttle in full, so an unusable interval is cleared rather than kept. */
const buildThrottlePatch = (state: ActionPolicyFormState): UpdateActionPolicyData['throttle'] => ({
  strategy: state.throttleStrategy,
  interval: needsInterval(state.throttleStrategy) ? state.throttleInterval : null,
});

export const toFormState = (response: ActionPolicyResponse): ActionPolicyFormState => {
  const groupingMode = response.grouping_mode ?? 'per_alert';

  return {
    name: response.name,
    description: response.description ?? '',
    matcher: response.matcher ?? null,
    groupingMode,
    groupBy: response.group_by ?? [],
    throttleStrategy: response.throttle?.strategy ?? DEFAULT_STRATEGY_FOR_MODE[groupingMode],
    throttleInterval: response.throttle?.interval ?? '',
    destinations: response.destinations.map((d) => ({ type: d.type, id: d.id })),
    inlineActions: [],
  };
};

export const toCreatePayload = (state: ActionPolicyFormState): CreateActionPolicyData => {
  const matcher = normalizeMatcher(state.matcher);
  return {
    name: state.name,
    ...(state.description ? { description: state.description } : {}),
    grouping_mode: state.groupingMode,
    ...(matcher ? { matcher } : {}),
    ...(state.groupingMode === 'per_field' && state.groupBy.length > 0
      ? { group_by: state.groupBy }
      : {}),
    throttle: buildThrottle(state),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};

/**
 * The form always submits the matcher in full, so an emptied sub-field has to be sent as `null`:
 * PATCH merges leaf by leaf, and an omitted leaf would keep the value the user just cleared.
 */
const toMatcherPatch = (
  matcher: ActionPolicyFormState['matcher']
): UpdateActionPolicyData['matcher'] => {
  const normalized = normalizeMatcher(matcher);
  if (!normalized) return null;

  return {
    tags: normalized.tags?.length ? normalized.tags : null,
    expression: normalized.expression?.trim() ? normalized.expression : null,
  };
};

export const toUpdatePayload = (state: ActionPolicyFormState): UpdateActionPolicyData => {
  return {
    name: state.name,
    description: state.description || null,
    grouping_mode: state.groupingMode,
    matcher: toMatcherPatch(state.matcher),
    group_by: state.groupingMode === 'per_field' && state.groupBy.length > 0 ? state.groupBy : null,
    throttle: buildThrottlePatch(state),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};
