/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnoozeCondition } from '@kbn/alerting-types';

export interface SnoozeAlertParams {
  ruleId: string;
  alertInstanceId: string;
}

export interface SnoozeAlertOptions extends SnoozeAlertParams {
  expiresAt?: string;
  conditions?: SnoozeCondition[];
  conditionOperator?: 'any' | 'all';
}
