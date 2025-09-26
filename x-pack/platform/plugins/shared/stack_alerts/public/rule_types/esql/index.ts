/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { ESQL_ID } from '@kbn/rule-data-utils';
import type { EsQueryRuleParams } from './types';
import { validateExpression } from './validation';

export function getRuleType(alerting: AlertingSetup): RuleTypeModel<EsQueryRuleParams> {
  return {
    id: ESQL_ID,
    description: i18n.translate('xpack.stackAlerts.esQuery.ui.alertType.descriptionText', {
      defaultMessage: 'Alert when matches are found during the latest query run.',
    }),
    iconClass: 'logoElastic',
    documentationUrl: (docLinks) => docLinks.links.alerting.esQuery,
    ruleParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.stackAlerts.esQuery.ui.alertType.defaultActionMessage',
      {
        defaultMessage: `Elasticsearch query rule '{{rule.name}}' is active:

- Value: '{{context.value}}'
- Conditions Met: '{{context.conditions}}' over '{{rule.params.timeWindowSize}}''{{rule.params.timeWindowUnit}}'
- Timestamp: '{{context.date}}'
- Link: '{{context.link}}'`,
      }
    ),
    requiresAppContext: false,
  };
}
