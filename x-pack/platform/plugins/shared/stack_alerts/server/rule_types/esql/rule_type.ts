/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import { ESQLParamsSchema, type ESQLParams } from '@kbn/response-ops-rule-params/esql';

import { STACK_ALERTS_AAD_CONFIG } from '..';
import type { RuleType } from '../../types';
import type { ActionContext } from './action_context';
import type { ExecutorOptions } from './types';
import { ActionGroupId } from '../../../common/esql';
import { executor } from './executor';
import { getSourceFields } from './util';
import type { StackAlertType } from '../types';
import type { ESQLRuleState } from './rule_type_params';

export const ESQL_RULE_ID = '.esql';
export function getRuleType(
  core: CoreSetup
): RuleType<
  ESQLParams,
  never,
  ESQLRuleState,
  {},
  ActionContext,
  typeof ActionGroupId,
  never,
  StackAlertType
> {
  const ruleTypeName = i18n.translate('xpack.stackAlerts.esql.alertTypeTitle', {
    defaultMessage: 'ES|QL',
  });

  const actionGroupName = i18n.translate('xpack.stackAlerts.esql.actionGroupThresholdMetTitle', {
    defaultMessage: 'Query matched',
  });

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date that the alert met the threshold condition.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that met the threshold condition.',
    }
  );

  const actionVariableContextHitsLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextHitsLabel',
    {
      defaultMessage: 'The documents that met the threshold condition.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A title for the alert.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string that describes the threshold condition.',
    }
  );

  const actionVariableEsqlQueryLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextEsqlQueryLabel',
    {
      defaultMessage: 'ES|QL query field used to fetch data from Elasticsearch.',
    }
  );

  const actionVariableContextLinkLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextLinkLabel',
    {
      defaultMessage: `Navigate to Discover and show the records that triggered
       the alert when the rule is created in Discover. Otherwise, navigate to the status page for the rule.`,
    }
  );

  const sourceFields = getSourceFields();

  return {
    id: ESQL_RULE_ID,
    name: ruleTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: {
        validate: (object: unknown) => ESQLParamsSchema.validate(object),
      },
    },
    schemas: {
      params: {
        type: 'config-schema',
        schema: ESQLParamsSchema,
      },
    },
    actionVariables: {
      context: [
        { name: 'message', description: actionVariableContextMessageLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'hits', description: actionVariableContextHitsLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
        { name: 'link', description: actionVariableContextLinkLabel, usesPublicBaseUrl: true },
      ],
      params: [{ name: 'esqlQuery', description: actionVariableEsqlQueryLabel }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (options: ExecutorOptions<ESQLParams>) => {
      return await executor(core, options, sourceFields);
    },
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: STACK_ALERTS_FEATURE_ID,
    solution: 'stack',
    doesSetRecoveryContext: false,
    alerts: STACK_ALERTS_AAD_CONFIG,
    autoRecoverAlerts: false,
  };
}
