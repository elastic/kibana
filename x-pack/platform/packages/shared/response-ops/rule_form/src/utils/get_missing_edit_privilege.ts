/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeWithDescription } from '../common';

export type MissingEditPrivilege = 'rule' | 'actions';

interface GetMissingEditPrivilegeParams {
  ruleType: RuleTypeWithDescription;
  consumer: string;
  hasActions: boolean;
  canExecuteActions: boolean;
}

/**
 * Returns the privilege the user lacks to edit a rule, or undefined when they can edit it.
 * Missing All privileges on the rule's consumer takes precedence over missing actions access.
 */
export const getMissingEditPrivilege = ({
  ruleType,
  consumer,
  hasActions,
  canExecuteActions,
}: GetMissingEditPrivilegeParams): MissingEditPrivilege | undefined => {
  if (!ruleType.authorizedConsumers[consumer]?.all) {
    return 'rule';
  }

  if (hasActions && !canExecuteActions) {
    return 'actions';
  }

  return undefined;
};
