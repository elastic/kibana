/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerts-as-data-utils';
import { RuleAlertData } from '../../types';
import { ReducerOpts } from './types';
import { reduceDelayedAlerts } from './delay';

// Add your reducer here and that's it
const reducers = [reduceDelayedAlerts];

export function reduceAlerts<AlertData extends RuleAlertData>(opts: ReducerOpts<AlertData>) {
  let result: Array<Alert & AlertData> = opts.alerts;
  for (const reducer of reducers) {
    result = reducer({ ...opts, alerts: result });
  }
  return result;
}
