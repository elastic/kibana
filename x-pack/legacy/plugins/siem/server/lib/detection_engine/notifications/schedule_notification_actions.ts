/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from '../../../../../../../plugins/alerting/server';
import { RuleTypeParamsWithName } from '../types';

interface ScheduleNotificationActions {
  alertInstance: AlertInstance;
  signalsCount: string;
  resultsLink: string;
  ruleParams: RuleTypeParamsWithName;
}

export const scheduleNotificationActions = ({
  alertInstance,
  signalsCount,
  resultsLink,
  ruleParams,
}: ScheduleNotificationActions): AlertInstance =>
  alertInstance
    .replaceState({
      signalsCount,
    })
    .scheduleActions('default', {
      resultsLink,
      rule: ruleParams,
    });
