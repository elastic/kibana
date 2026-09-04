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
  UpdateActionPolicyBody,
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

const buildThrottle = (state: ActionPolicyFormState) => ({
  strategy: state.throttleStrategy,
  interval: needsInterval(state.throttleStrategy) ? state.throttleInterval : null,
});

export const toFormState = (response: ActionPolicyResponse): ActionPolicyFormState => {
  const groupingMode = response.grouping_mode ?? 'per_episode';

  return {
    name: response.name,
    description: response.description,
    tags: response.tags ?? [],
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
    description: state.description,
    grouping_mode: state.groupingMode,
    ...(state.tags.length > 0 ? { tags: state.tags } : {}),
    ...(matcher ? { matcher } : {}),
    ...(state.groupingMode === 'per_field' && state.groupBy.length > 0
      ? { group_by: state.groupBy }
      : {}),
    throttle: buildThrottle(state),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};

export const toUpdatePayload = (
  state: ActionPolicyFormState,
  version: string
): UpdateActionPolicyBody => {
  return {
    version,
    name: state.name,
    description: state.description,
    grouping_mode: state.groupingMode,
    tags: state.tags.length > 0 ? state.tags : null,
    matcher: normalizeMatcher(state.matcher),
    group_by: state.groupingMode === 'per_field' && state.groupBy.length > 0 ? state.groupBy : null,
    throttle: buildThrottle(state),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};
