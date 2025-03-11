/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RuleNotifyWhenType } from '../../../../common';

/**
 * Given a throttle from a "security_solution" rule this will transform it into an "alerting" notifyWhen
 * on their saved object.
 * @params throttle The throttle from a "security_solution" rule
 * @returns The correct "NotifyWhen" for a Kibana alerting.
 */
export const transformToNotifyWhen = (
  throttle: string | null | undefined
): RuleNotifyWhenType | null => {
  if (throttle == null || throttle === 'no_actions') {
    return null; // Although I return null, this does not change the value of the "notifyWhen" and it keeps the current value of "notifyWhen"
  } else if (throttle === 'rule') {
    return 'onActiveAlert';
  } else {
    return 'onThrottleInterval';
  }
};
