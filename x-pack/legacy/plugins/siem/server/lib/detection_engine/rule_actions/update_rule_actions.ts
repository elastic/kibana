/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient, AlertServices } from '../../../../../../../plugins/alerting/server';
import { getRuleActionsSavedObject } from './get_rule_actions_saved_object';
import { readRules } from '../rules/read_rules';
import { transformRuleToAlertAction } from '../../../../common/detection_engine/transform_actions';

interface UpdateRuleActions {
  alertsClient: AlertsClient;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  ruleAlertId: string;
}

export const updateRuleActions = async ({
  alertsClient,
  savedObjectsClient,
  ruleAlertId,
}: UpdateRuleActions) => {
  const rule = await readRules({ alertsClient, id: ruleAlertId });
  if (rule == null) {
    return null;
  }

  const { actions, alertThrottle } = await getRuleActionsSavedObject({
    savedObjectsClient,
    ruleAlertId,
  });

  return alertsClient.update({
    id: ruleAlertId,
    data: {
      ...rule,
      actions: actions?.map(transformRuleToAlertAction),
      throttle: alertThrottle,
    },
  });
};
