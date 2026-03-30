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
import { DEFAULT_SUPPRESSION_MECHANISMS } from './constants';
import type {
  DispatchPer,
  NotificationPolicyFormState,
  NotificationPolicyFrequency,
  RepeatIntervalUnit,
} from './types';

const REPEAT_INTERVAL_PARSE = /^([1-9][0-9]*)(s|m|h|d)$/;

function parseRepeatInterval(
  interval: string
): { repeatValue: number; repeatUnit: RepeatIntervalUnit } | null {
  const m = interval.match(REPEAT_INTERVAL_PARSE);
  if (!m) {
    return null;
  }
  return { repeatValue: parseInt(m[1], 10), repeatUnit: m[2] as RepeatIntervalUnit };
}

function throttleFromFrequency(
  frequency: NotificationPolicyFrequency
): { interval: string } | null {
  if (frequency.type === 'group_throttle') {
    return { interval: `${frequency.repeatValue}${frequency.repeatUnit}` };
  }
  if (frequency.type === 'episode_status_change_repeat') {
    return { interval: `${frequency.repeatValue}${frequency.repeatUnit}` };
  }
  return null;
}

function frequencyFromThrottle(
  throttle: { interval: string } | null | undefined,
  dispatchPer: DispatchPer
): NotificationPolicyFrequency {
  if (!throttle) {
    return dispatchPer === 'group'
      ? { type: 'group_immediate' }
      : { type: 'episode_every_evaluation' };
  }
  if (dispatchPer === 'group') {
    const parsed = parseRepeatInterval(throttle.interval);
    if (parsed) {
      return {
        type: 'group_throttle',
        repeatValue: parsed.repeatValue,
        repeatUnit: parsed.repeatUnit,
      };
    }
    return {
      type: 'group_throttle',
      repeatValue: 10,
      repeatUnit: 'm',
    };
  }
  const parsed = parseRepeatInterval(throttle.interval);
  if (parsed) {
    return {
      type: 'episode_status_change_repeat',
      repeatValue: parsed.repeatValue,
      repeatUnit: parsed.repeatUnit,
    };
  }
  // Throttle present but not in Ns/Nm/Nh/Nd form — show a safe default repeat; user can adjust.
  return {
    type: 'episode_status_change_repeat',
    repeatValue: 5,
    repeatUnit: 'm',
  };
}

export const toFormState = (response: NotificationPolicyResponse): NotificationPolicyFormState => {
  const hasGroup = (response.groupBy?.length ?? 0) > 0;
  const dispatchPer: DispatchPer = hasGroup ? 'group' : 'episode';

  return {
    name: response.name,
    description: response.description,
    matcher: response.matcher ?? '',
    groupBy: response.groupBy ?? [],
    dispatchPer,
    frequency: frequencyFromThrottle(response.throttle, dispatchPer),
    destinations: response.destinations.map((d) => ({ type: d.type, id: d.id })),
    suppressionMechanisms: DEFAULT_SUPPRESSION_MECHANISMS,
  };
};

export const toCreatePayload = (
  state: NotificationPolicyFormState
): CreateNotificationPolicyData => {
  const throttle = throttleFromFrequency(state.frequency);
  return {
    name: state.name,
    description: state.description,
    ...(state.matcher ? { matcher: state.matcher } : {}),
    ...(state.groupBy.length > 0 ? { groupBy: state.groupBy } : {}),
    ...(throttle ? { throttle } : {}),
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};

export const toUpdatePayload = (
  state: NotificationPolicyFormState,
  version: string
): UpdateNotificationPolicyBody => {
  const throttle = throttleFromFrequency(state.frequency);
  return {
    version,
    name: state.name,
    description: state.description,
    matcher: state.matcher || null,
    groupBy: state.groupBy.length > 0 ? state.groupBy : null,
    throttle: throttle ?? null,
    destinations: state.destinations.map((d) => ({ type: d.type, id: d.id })),
  };
};
