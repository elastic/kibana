/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ESQL_ID, STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import type { AlertInstanceContext } from '@kbn/alerting-plugin/server';
import { EsqlRuleParamsSchema, type EsqlRuleParams } from '@kbn/response-ops-rule-params/esql';
import { STACK_ALERTS_AAD_CONFIG } from '..';
import type { RuleType } from '../../types';
import type { EsqlRuleParamsExtractedParams, EsqlRuleState } from './rule_type_params';
import { validateServerless } from './rule_type_params';

import type { ExecutorOptions } from './types';
import { ActionGroupId } from '../../../common/es_query';
import { executor } from './executor';
import type { StackAlertType } from '../types';

export function getRuleType(
  core: CoreSetup,
  isServerless: boolean
): RuleType<
  EsqlRuleParams,
  EsqlRuleParamsExtractedParams,
  EsqlRuleState,
  {},
  AlertInstanceContext,
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

  const actionVariableContextIndexLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextIndexLabel',
    {
      defaultMessage: 'The indices the rule queries.',
    }
  );

  const actionVariableContextQueryLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextQueryLabel',
    {
      defaultMessage: 'The string representation of the Elasticsearch query.',
    }
  );

  const actionVariableContextSizeLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextSizeLabel',
    {
      defaultMessage:
        'The number of documents to pass to the configured actions when the threshold condition is met.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        'An array of rule threshold values. For between and notBetween thresholds, there are two values.',
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'The comparison function for the threshold.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string that describes the threshold condition.',
    }
  );

  const actionVariableSearchConfigurationLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextSearchConfigurationLabel',
    {
      defaultMessage:
        'The query definition, which uses KQL or Lucene to fetch the documents from Elasticsearch.',
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

  const actionVariableContextGroupingLabel = i18n.translate(
    'xpack.stackAlerts.esql.actionVariableContextGroupingLabel',
    {
      defaultMessage: 'The object containing groups that are reporting data',
    }
  );

  return {
    id: ESQL_ID,
    name: ruleTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: {
        validate: (object: unknown) => {
          const validated = EsqlRuleParamsSchema.validate(object);
          if (isServerless) {
            validateServerless(validated);
          }
          return validated;
        },
      },
    },
    schemas: {
      params: {
        type: 'config-schema',
        schema: EsqlRuleParamsSchema,
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
        { name: 'grouping', description: actionVariableContextGroupingLabel },
      ],
      params: [
        { name: 'size', description: actionVariableContextSizeLabel },
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
        { name: 'searchConfiguration', description: actionVariableSearchConfigurationLabel },
        { name: 'esQuery', description: actionVariableContextQueryLabel },
        { name: 'index', description: actionVariableContextIndexLabel },
        { name: 'esqlQuery', description: actionVariableEsqlQueryLabel },
      ],
    },
    useSavedObjectReferences: {
      extractReferences: (params) => {
        return { params: params as EsqlRuleParamsExtractedParams, references: [] };
      },
      injectReferences: (params) => {
        return params;
      },
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (options: ExecutorOptions<EsqlRuleParams>) => {
      return await executor(core, options);
    },
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: STACK_ALERTS_FEATURE_ID,
    solution: 'stack',
    doesSetRecoveryContext: true,
    alerts: STACK_ALERTS_AAD_CONFIG,
  };
}
