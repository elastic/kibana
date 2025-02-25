/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerts-as-data-utils';
import { RuleAlertData } from '../../types';
import { AlertRule } from '../../alerts_client/types';

export interface ReducerOpts<AlertData extends RuleAlertData> {
  rule: AlertRule;
  alerts: Array<Alert & AlertData>;
}
