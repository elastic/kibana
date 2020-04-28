/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { ruleActionsSavedObjectType } from './saved_object_mappings';
import { getRuleActionsSavedObject } from './get_rule_actions_saved_object';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { getThrottleOptions } from './utils';
import { IRuleActionsAttributesSavedObjectAttributes } from './types';

interface DeleteRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: RuleAlertAction[] | undefined;
  throttle: string | undefined;
}

export const updateRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions,
  throttle,
}: DeleteRuleActionsSavedObject) => {
  const ruleActions = await getRuleActionsSavedObject({ ruleAlertId, savedObjectsClient });

  if (!ruleActions) return null;

  const throttleOptions = throttle
    ? getThrottleOptions(throttle)
    : {
        ruleThrottle: ruleActions.ruleThrottle,
        alertThrottle: ruleActions.alertThrottle,
      };

  const options = {
    actions: actions ?? ruleActions.actions,
    ...throttleOptions,
  };

  await savedObjectsClient.update<IRuleActionsAttributesSavedObjectAttributes>(
    ruleActionsSavedObjectType,
    ruleActions.id,
    {
      ruleAlertId,
      ...options,
    }
  );

  return {
    id: ruleActions.id,
    ...options,
  };
};
