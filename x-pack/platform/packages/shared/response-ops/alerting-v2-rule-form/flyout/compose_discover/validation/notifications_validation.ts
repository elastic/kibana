/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isActionValid } from '../../../actions_form';
import type { RuleNotificationsValue } from '../../../form/types';

const INCOMPLETE_ACTIONS_ERROR = i18n.translate(
  'xpack.alertingV2.composeDiscover.validation.incompleteActionsError',
  { defaultMessage: 'Complete or remove incomplete actions before continuing' }
);

export const isNotificationsStepValid = (
  notifications: RuleNotificationsValue | undefined
): boolean => {
  if (!notifications) {
    return true;
  }
  return notifications.workflows.every(isActionValid);
};

/** RHF `rules.validate` for notifications — `true` or an i18n error message. */
export const validateNotifications = (
  notifications: RuleNotificationsValue | undefined
): true | string => (isNotificationsStepValid(notifications) ? true : INCOMPLETE_ACTIONS_ERROR);
