/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleNotifyWhenType } from '@kbn/alerting-types';
import { RuleNotifyWhenTypeValues } from '@kbn/alerting-types';

export function validateNotifyWhenType(notifyWhen: string) {
  if (RuleNotifyWhenTypeValues.includes(notifyWhen as RuleNotifyWhenType)) {
    return;
  }
  return `string is not a valid RuleNotifyWhenType: ${notifyWhen}`;
}

export type { RuleNotifyWhenType } from '@kbn/alerting-types';
export { RuleNotifyWhenTypeValues, RuleNotifyWhen } from '@kbn/alerting-types';
