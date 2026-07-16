/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isActionValid } from '../../../actions_form';
import type { RuleNotificationsValue } from '../../../form/types';

export const isNotificationsStepValid = (
  notifications: RuleNotificationsValue | undefined
): boolean => {
  if (!notifications) {
    return true;
  }
  return notifications.workflows.every(isActionValid);
};
