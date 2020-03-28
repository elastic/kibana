/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { ruleActionsSavedObjectType } from './saved_object_mappings';
import { getRuleActionsSavedObject } from './get_rule_actions_saved_object';
import { RuleAlertAction } from '../../../../common/detection_engine/types';

interface DeleteRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: RuleAlertAction[];
  throttle: string | undefined;
}

export const updateRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions,
  throttle,
}: DeleteRuleActionsSavedObject) => {
  const { id } = await getRuleActionsSavedObject({ ruleAlertId, savedObjectsClient });

  if (!id) return null;

  return savedObjectsClient.update(ruleActionsSavedObjectType, id, {
    ruleAlertId,
    actions,
    ruleThrottle: throttle ?? 'no_actions',
    alertThrottle: throttle && ['no_actions', 'rule'].includes(throttle) ? null : throttle,
  });
};
