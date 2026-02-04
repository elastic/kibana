/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeModel, RuleTypeWithDescription } from '@kbn/alerts-ui-shared';

export const getDefaultParams = ({
  group,
  ruleType,
  actionTypeModel,
}: {
  group: string;
  actionTypeModel: ActionTypeModel;
  ruleType: RuleTypeWithDescription;
}): ActionTypeModel['defaultActionParams'] => {
  if (group === ruleType.recoveryActionGroup.id) {
    return actionTypeModel.defaultRecoveredActionParams;
  } else {
    return actionTypeModel.defaultActionParams;
  }
};
