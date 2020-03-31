/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { getRuleActionsSavedObject } from './get_rule_actions_saved_object';
import { createRuleActionsSavedObject } from './create_rule_actions_saved_object';
import { updateRuleActionsSavedObject } from './update_rule_actions_saved_object';
import { RuleActions } from './types';

interface UpdateOrCreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: RuleAlertAction[] | undefined;
  throttle: string | undefined;
}

export const updateOrCreateRuleActionsSavedObject = async ({
  savedObjectsClient,
  ruleAlertId,
  actions,
  throttle,
}: UpdateOrCreateRuleActionsSavedObject): Promise<RuleActions> => {
  const currentRuleActions = await getRuleActionsSavedObject({ ruleAlertId, savedObjectsClient });

  if (currentRuleActions) {
    return updateRuleActionsSavedObject({
      ruleAlertId,
      savedObjectsClient,
      actions,
      throttle,
    }) as Promise<RuleActions>;
  }

  return createRuleActionsSavedObject({ ruleAlertId, savedObjectsClient, actions, throttle });
};
