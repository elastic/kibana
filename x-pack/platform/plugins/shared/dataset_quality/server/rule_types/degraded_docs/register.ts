/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleType } from '@kbn/alerting-plugin/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  DegradedDocsRuleParams,
  degradedDocsParamsSchema,
} from '@kbn/response-ops-rule-params/degraded_docs';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_GROUPING,
  ALERT_REASON,
  DEGRADED_DOCS_RULE_TYPE_ID,
  STACK_ALERTS_FEATURE_ID,
} from '@kbn/rule-data-utils';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';
import {
  DATASET_QUALITY_REGISTRATION_CONTEXT,
  DatasetQualityAlert,
  DatasetQualityAlertContext,
  DatasetQualityAllowedActionGroups,
  THRESHOLD_MET_GROUP,
} from '../types';
import { getRuleExecutor } from './executor';

export function DegradedDocsRuleType(
  locatorsClient?: LocatorClient
): RuleType<
  DegradedDocsRuleParams,
  never,
  {},
  {},
  DatasetQualityAlertContext,
  DatasetQualityAllowedActionGroups,
  never,
  DatasetQualityAlert
> {
  return {
    id: DEGRADED_DOCS_RULE_TYPE_ID,
    name: i18n.translate('xpack.datasetQuality.rule.degradedDocs.name', {
      defaultMessage: 'Degraded docs',
    }),
    solution: 'stack',
    validate: {
      params: degradedDocsParamsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema',
        schema: degradedDocsParamsSchema,
      },
    },
    defaultActionGroupId: THRESHOLD_MET_GROUP.id,
    actionGroups: [THRESHOLD_MET_GROUP],
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: STACK_ALERTS_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: getRuleExecutor(locatorsClient),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'reason', description: actionVariableContextReasonLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'grouping', description: actionVariableContextGroupingLabel },
        {
          name: 'threshold',
          description: actionVariableContextThresholdLabel,
        },
        { name: 'viewInAppUrl', description: viewInAppUrlActionVariableDescription },
      ],
    },
    alerts: {
      context: DATASET_QUALITY_REGISTRATION_CONTEXT,
      mappings: {
        fieldMap: {
          [ALERT_REASON]: { type: 'keyword', array: false, required: false },
          [ALERT_EVALUATION_VALUE]: { type: 'keyword', array: false, required: false },
          [ALERT_EVALUATION_THRESHOLD]: {
            type: 'scaled_float',
            scaling_factor: 100,
            required: false,
          },
          [ALERT_GROUPING]: {
            type: 'object',
            dynamic: true,
            array: false,
            required: false,
          },
        },
        dynamicTemplates: [
          {
            strings_as_keywords: {
              path_match: 'kibana.alert.grouping.*',
              match_mapping_type: 'string',
              mapping: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
        ],
      },
      shouldWrite: true,
      useEcs: true,
    },
  };
}

export const actionVariableContextReasonLabel = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextReasonLabel',
  {
    defaultMessage: 'A concise description of the reason for the alert.',
  }
);

const actionVariableContextValueLabel = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextValueLabel',
  {
    defaultMessage: 'The value that met the threshold condition.',
  }
);

const actionVariableContextThresholdLabel = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextThresholdLabel',
  {
    defaultMessage:
      'An array of rule threshold values. For between and notBetween thresholds, there are two values.',
  }
);

const actionVariableContextGroupingLabel = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextGrouping',
  {
    defaultMessage: 'The object containing groups that are reporting data',
  }
);

export const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.datasetQuality.alerting.actionVariableContextViewInAppUrl',
  {
    defaultMessage: 'Link to the alert source',
  }
);
