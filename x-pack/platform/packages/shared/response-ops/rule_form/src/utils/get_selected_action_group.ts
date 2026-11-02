/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuleTypeModel, RuleTypeParams, RuleTypeWithDescription } from '../common';

const recoveredActionGroupMessage = i18n.translate(
  'responseOpsRuleForm.actionForm.actionGroupRecoveredMessage',
  {
    defaultMessage: 'Recovered',
  }
);

export const getActionGroups = ({
  ruleType,
  ruleTypeModel,
}: {
  ruleType: RuleTypeWithDescription;
  ruleTypeModel: RuleTypeModel<RuleTypeParams>;
}) => {
  return ruleType.actionGroups.map((item) =>
    item.id === ruleType.recoveryActionGroup.id
      ? {
          ...item,
          omitMessageVariables: ruleType.doesSetRecoveryContext ? 'keepContext' : 'all',
          defaultActionMessage: ruleTypeModel.defaultRecoveryMessage || recoveredActionGroupMessage,
        }
      : { ...item, defaultActionMessage: ruleTypeModel.defaultActionMessage }
  );
};

export const getSelectedActionGroup = ({
  group,
  ruleType,
  ruleTypeModel,
}: {
  group: string;
  ruleType: RuleTypeWithDescription;
  ruleTypeModel: RuleTypeModel<RuleTypeParams>;
}) => {
  const actionGroups = getActionGroups({
    ruleType,
    ruleTypeModel,
  });

  const defaultActionGroup = actionGroups?.find(({ id }) => id === ruleType.defaultActionGroupId);

  return actionGroups?.find(({ id }) => id === group) ?? defaultActionGroup;
};
