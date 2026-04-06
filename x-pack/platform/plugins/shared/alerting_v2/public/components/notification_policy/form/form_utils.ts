/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateNotificationPolicyData,
  NotificationPolicyResponse,
  ThrottleStrategy,
  UpdateNotificationPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { DEFAULT_STRATEGY_FOR_MODE } from './constants';
import type { NotificationPolicyFormState } from './types';

export const needsInterval = (strategy: ThrottleStrategy): boolean =>
  strategy === 'per_status_interval' || strategy === 'time_interval';

const buildThrottle = (state: NotificationPolicyFormState) => ({
  strategy: state.throttleStrategy,
  ...(needsInterval(state.throttleStrategy) ? { interval: state.throttleInterval } : {}),
});

export const toFormState = (response: NotificationPolicyResponse): NotificationPolicyFormState => {
  const groupingMode = response.groupingMode ?? 'per_episode';

  return {
    name: response.name,
    description: response.description,
    matcher: response.matcher ?? '',
    groupingMode,
    groupBy: response.groupBy ?? [],
    throttleStrategy: response.throttle?.strategy ?? DEFAULT_STRATEGY_FOR_MODE[groupingMode],
    throttleInterval: response.throttle?.interval ?? '',
    destinations: response.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};

export const toCreatePayload = (
  state: NotificationPolicyFormState
): CreateNotificationPolicyData => {
  return {
    name: state.name,
    description: state.description,
    groupingMode: state.groupingMode,
    ...(state.matcher ? { matcher: state.matcher } : {}),
    ...(state.groupingMode === 'per_field' && state.groupBy.length > 0
      ? { groupBy: state.groupBy }
      : {}),
    throttle: buildThrottle(state),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};

export const toUpdatePayload = (
  state: NotificationPolicyFormState,
  version: string
): UpdateNotificationPolicyBody => {
  return {
    version,
    name: state.name,
    description: state.description,
    groupingMode: state.groupingMode,
    matcher: state.matcher || null,
    groupBy: state.groupingMode === 'per_field' && state.groupBy.length > 0 ? state.groupBy : null,
    throttle: buildThrottle(state),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};
