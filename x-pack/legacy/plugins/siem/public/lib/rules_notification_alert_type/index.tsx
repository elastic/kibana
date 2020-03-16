/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../../../plugins/triggers_actions_ui/public/types';
import { RulesNotificationExpression } from './expression';
import { validateRulesNotificationAlertType } from './validation';
import { NOTIFICATIONS_ID } from '../../../common/constants';

export const getRulesNotificationAlertType = (): AlertTypeModel => ({
  id: NOTIFICATIONS_ID,
  name: 'SIEM Notification',
  iconClass: 'securitySignal',
  alertParamsExpression: RulesNotificationExpression,
  validate: validateRulesNotificationAlertType,
  defaultActionMessage: 'Rule {{context.rule.name}} generated {{state.signalsCount}} signals',
});
