/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeWithDescription } from '../common';

interface GetEditRulePermissionsParams {
  ruleType: RuleTypeWithDescription;
  consumer: string;
  hasActions: boolean;
  canExecuteActions: boolean;
}

export interface EditRulePermissions {
  /** The user has All privileges on the rule's consumer. */
  canEditRule: boolean;
  /** The rule's existing actions do not block the edit: it has none, or the user can execute them. */
  canEditActions: boolean;
}

export const getEditRulePermissions = ({
  ruleType,
  consumer,
  hasActions,
  canExecuteActions,
}: GetEditRulePermissionsParams): EditRulePermissions => ({
  canEditRule: !!ruleType.authorizedConsumers[consumer]?.all,
  canEditActions: !hasActions || canExecuteActions,
});
