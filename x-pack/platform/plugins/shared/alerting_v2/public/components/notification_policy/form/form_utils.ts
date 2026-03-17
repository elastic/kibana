/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateNotificationPolicyData,
  NotificationPolicyResponse,
  UpdateNotificationPolicyBody,
} from '@kbn/alerting-v2-schemas';
import type { NotificationPolicyFormState } from './types';

export const toFormState = (response: NotificationPolicyResponse): NotificationPolicyFormState => {
  return {
    name: response.name,
    description: response.description,
    matcher: response.matcher ?? '',
    groupBy: response.group_by ?? [],
    frequency: response.throttle
      ? { type: 'throttle', interval: response.throttle.interval }
      : { type: 'immediate' },
    destinations: response.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};

export const toCreatePayload = (
  state: NotificationPolicyFormState
): CreateNotificationPolicyData => {
  return {
    name: state.name,
    description: state.description,
    ...(state.matcher ? { matcher: state.matcher } : {}),
    ...(state.groupBy.length > 0 ? { group_by: state.groupBy } : {}),
    ...(state.frequency.type === 'throttle'
      ? { throttle: { interval: state.frequency.interval } }
      : {}),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};

export const toUpdatePayload = (
  state: NotificationPolicyFormState,
  version: string
): UpdateNotificationPolicyBody => {
  return {
    ...toCreatePayload(state),
    version,
  };
};
