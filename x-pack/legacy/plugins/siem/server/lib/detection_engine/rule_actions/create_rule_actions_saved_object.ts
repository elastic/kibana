/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { ruleActionsSavedObjectType } from './saved_object_mappings';

interface CreateRuleActionsSavedObject {
  ruleAlertId: string;
  savedObjectsClient: AlertServices['savedObjectsClient'];
  actions: RuleAlertAction[];
  throttle: string | undefined;
}

export const createRuleActionsSavedObject = async ({
  ruleAlertId,
  savedObjectsClient,
  actions,
  throttle,
}: CreateRuleActionsSavedObject) => {
  const ruleActionsSavedObject = await savedObjectsClient.create(ruleActionsSavedObjectType, {
    ruleAlertId,
    actions,
    ruleThrottle: throttle ?? 'no_actions',
    alertThrottle: throttle && ['no_actions', 'rule'].includes(throttle) ? null : throttle,
  });

  console.error('ruleActionsSavedObject', JSON.stringify(ruleActionsSavedObject, null, 2));

  return ruleActionsSavedObject;
};
