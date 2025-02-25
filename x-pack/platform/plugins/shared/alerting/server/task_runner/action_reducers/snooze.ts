/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReducerOpts } from './types';
import { AlertInstanceContext, AlertInstanceState } from '../../../common';
import { getRuleSnoozeEndTime } from '../../lib';

export function reduceAlertsWhenRuleSnoozed<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
>(opts: ReducerOpts<State, Context>) {
  const isSnoozed = !!getRuleSnoozeEndTime(opts.rule);
  return opts.alerts.filter((a) => {
    return !isSnoozed;
  });
}
