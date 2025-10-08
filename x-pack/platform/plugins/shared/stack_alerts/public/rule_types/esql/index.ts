/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { ESQLRuleParams } from './types';
import { validateExpression } from './validation';

export function getRuleType(): RuleTypeModel<ESQLRuleParams> {
  return {
    id: '.esql',
    description: i18n.translate('xpack.stackAlerts.esql.ui.alertType.descriptionText', {
      defaultMessage: 'Creates alerts for matches found during the latest query run.',
    }),
    iconClass: 'logoElastic',
    documentationUrl: null,
    ruleParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.stackAlerts.esql.ui.alertType.defaultActionMessage',
      {
        defaultMessage: `ES|QL rule '{{rule.name}}' is active:

- Conditions Met: Over '{{rule.params.timeWindowSize}}''{{rule.params.timeWindowUnit}}'
- Timestamp: '{{context.date}}'
- Link: '{{context.link}}'`,
      }
    ),
    requiresAppContext: false,
  };
}
