/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReducerOpts } from './types';
import { RuleAlertData } from '../../types';

export function reduceDelayedAlerts<AlertData extends RuleAlertData>(opts: ReducerOpts<AlertData>) {
  return opts.alerts.filter((a) => {
    // TODO: Look at rule state to determine if alert is reported < X time
    // and whether or not the feature is used.
    return true;
  });
}
