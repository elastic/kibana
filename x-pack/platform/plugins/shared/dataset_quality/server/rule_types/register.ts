/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  DATASET_QUALITY_RULE_TYPE_ID,
  STACK_ALERTS_FEATURE_ID,
} from '@kbn/rule-data-utils';
import { RuleType } from '@kbn/alerting-plugin/server';
import {
  DatasetQualityRuleParams,
  datasetQualityParamsSchema,
} from '@kbn/response-ops-rule-params/dataset_quality/v1';
import { getRuleExecutor } from './executor';
import {
  ALERT_EVALUATION_CONDITIONS,
  ALERT_TITLE,
  DATASET_QUALITY_AAD_FIELDS,
  DATASET_QUALITY_REGISTRATION_CONTEXT,
  DatasetQualityAlert,
  DatasetQualityAlertContext,
  DatasetQualityAllowedActionGroups,
  THRESHOLD_MET_GROUP,
} from './types';

export function DatasetQualityRuleType(): RuleType<
  DatasetQualityRuleParams,
  never,
  {},
  {},
  DatasetQualityAlertContext,
  DatasetQualityAllowedActionGroups,
  never,
  DatasetQualityAlert
> {
  return {
    id: DATASET_QUALITY_RULE_TYPE_ID,
    name: i18n.translate('xpack.datasetQuality.rule.name', {
      defaultMessage: 'Dataset quality',
    }),
    solution: 'stack',
    fieldsForAAD: DATASET_QUALITY_AAD_FIELDS,
    validate: {
      params: datasetQualityParamsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema',
        schema: datasetQualityParamsSchema,
      },
    },
    defaultActionGroupId: THRESHOLD_MET_GROUP.id,
    actionGroups: [THRESHOLD_MET_GROUP],
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: STACK_ALERTS_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: getRuleExecutor(),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'reason', description: actionVariableContextReasonLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
        {
          name: 'threshold',
          description: actionVariableContextThresholdLabel,
          usesPublicBaseUrl: true,
        },
      ],
    },
    alerts: {
      context: DATASET_QUALITY_REGISTRATION_CONTEXT,
      mappings: {
        fieldMap: {
          [ALERT_REASON]: { type: 'keyword', array: false, required: false },
          [ALERT_TITLE]: { type: 'keyword', array: false, required: false },
          [ALERT_EVALUATION_VALUE]: { type: 'keyword', array: false, required: false },
          [ALERT_EVALUATION_CONDITIONS]: { type: 'keyword', array: false, required: false },
          [ALERT_EVALUATION_THRESHOLD]: {
            type: 'scaled_float',
            scaling_factor: 100,
            required: false,
          },
        },
      },
      shouldWrite: true,
      useEcs: true,
    },
  };
}

export const actionVariableContextReasonLabel = i18n.translate(
  'xpack.datasetQuality.alerting.degradedDocs.reasonDescription',
  {
    defaultMessage: 'A reason for the alert.',
  }
);

const actionVariableContextValueLabel = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextValueLabel',
  {
    defaultMessage: 'The value that met the threshold condition.',
  }
);

const actionVariableContextTitleLabel = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextTitleLabel',
  {
    defaultMessage: 'A title for the alert.',
  }
);

const actionVariableContextThresholdLabel = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextThresholdLabel',
  {
    defaultMessage:
      'An array of rule threshold values. For between and notBetween thresholds, there are two values.',
  }
);

const actionVariableContextConditionsLabel = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextConditionsLabel',
  {
    defaultMessage: 'A string that describes the threshold condition.',
  }
);
