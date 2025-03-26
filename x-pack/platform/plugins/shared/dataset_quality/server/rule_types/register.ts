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
  DATASET_QUALITY_RULE_TYPE_ID,
  STACK_ALERTS_FEATURE_ID,
} from '@kbn/rule-data-utils';
import { RuleType } from '@kbn/alerting-plugin/server';
import {
  DatasetQualityRuleParams,
  datasetQualityParamsSchema,
} from '@kbn/response-ops-rule-params/dataset_quality/v1';
import { DATASET_QUALITY_AAD_FIELDS, THRESHOLD_MET_GROUP } from '../../common/alerting/constants';
import { getRuleExecutor } from './executor';
import {
  ALERT_EVALUATION_CONDITIONS,
  ALERT_TITLE,
  DatasetQualityAlert,
  DatasetQualityAlertContext,
  DatasetQualityAllowedActionGroups,
} from './types';

export const DATASET_QUALITY_REGISTRATION_CONTEXT = 'observability.datasetQuality';

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
    // List of fields available in the alert document
    fieldsForAAD: DATASET_QUALITY_AAD_FIELDS, // What is this? AAD (save info and show later, not trigger and forget) Define specific mapping (data_stream.name, etc)
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
    minimumLicenseRequired: 'basic', // TODO: Update license
    isExportable: true,
    executor: getRuleExecutor(),
    doesSetRecoveryContext: true,
    // Variables that will be available in the actions context. TODO: Update this
    actionVariables: {
      context: [
        { name: 'reason', description: reasonActionDegradedDocsDescription },
        { name: 'message', description: 'message' },
        { name: 'title', description: 'title' },
        { name: 'group', description: 'group' },
        { name: 'date', description: 'date' },
        { name: 'value', description: 'value' },
      ],
    },
    alerts: {
      context: 'stack1',
      mappings: {
        fieldMap: {
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

export const reasonActionDegradedDocsDescription = i18n.translate(
  'xpack.datasetQuality.alerting.degradedDocs.reasonDescription',
  {
    defaultMessage: 'Number of degraded documents has exceeded the threshold',
  }
);
