/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateActionPolicyData,
  ActionPolicyResponse,
  UpdateActionPolicyData,
} from '@kbn/alerting-v2-schemas';
import { needsInterval } from '@kbn/alerting-v2-schemas';
import { normalizeMatcher } from '@kbn/alerting-v2-utils';
import { DEFAULT_STRATEGY_FOR_MODE } from './constants';
import type { ActionPolicyFormState } from './types';

export { needsInterval };

/**
 * The throttle is one strategy variant, so the interval is sent only by the strategies that have
 * one. A PATCH replaces the whole block, which is what the form submits either way.
 */
const buildThrottle = (state: ActionPolicyFormState): CreateActionPolicyData['throttle'] =>
  needsInterval(state.throttleStrategy)
    ? { strategy: state.throttleStrategy, interval: state.throttleInterval }
    : { strategy: state.throttleStrategy };

export const toFormState = (response: ActionPolicyResponse): ActionPolicyFormState => {
  const groupingMode = response.grouping_mode ?? 'per_alert';
  const { throttle } = response;

  return {
    name: response.name,
    description: response.description ?? '',
    matcher: response.matcher ?? null,
    groupingMode,
    groupBy: response.group_by ?? [],
    throttleStrategy: throttle?.strategy ?? DEFAULT_STRATEGY_FOR_MODE[groupingMode],
    // The form keeps an interval field for every strategy, so the intervalless variants seed it blank.
    throttleInterval: throttle && 'interval' in throttle ? throttle.interval : '',
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

  return { tags: normalized.tags ?? null, expression: normalized.expression ?? null };
};

export const toUpdatePayload = (state: ActionPolicyFormState): UpdateActionPolicyData => {
  return {
    name: state.name,
    description: state.description || null,
    grouping_mode: state.groupingMode,
    matcher: toMatcherPatch(state.matcher),
    group_by: state.groupingMode === 'per_field' && state.groupBy.length > 0 ? state.groupBy : null,
    throttle: buildThrottle(state),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};
