/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_GROUPING,
  ALERT_NAMESPACE,
} from '@kbn/rule-data-utils';
import type { StackAlertType } from './types';

export const STACK_AAD_INDEX_NAME = 'stack';

export const ALERT_TITLE = `${ALERT_NAMESPACE}.title` as const;
// kibana.alert.evaluation.conditions - human readable string that shows the conditions set by the user
export const ALERT_EVALUATION_CONDITIONS = `${ALERT_NAMESPACE}.evaluation.conditions` as const;

export const STACK_ALERTS_AAD_CONFIG: IRuleTypeAlerts<StackAlertType> = {
  context: STACK_AAD_INDEX_NAME,
  mappings: {
    fieldMap: {
      'alert.start': { type: 'date', array: false, required: false },
      'alert.end': { type: 'date', array: false, required: false },
      'alert.flapping': { type: 'boolean', array: false, required: false },
      'lineage.parents': { type: 'keyword', array: true, required: false },
      [ALERT_TITLE]: { type: 'keyword', array: false, required: false },
      [ALERT_EVALUATION_CONDITIONS]: { type: 'keyword', array: false, required: false },
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
          path_match: `${ALERT_GROUPING}.*`,
          match_mapping_type: 'string',
          mapping: { type: 'keyword', ignore_above: 1024 },
        },
      },
    ],
  },
  shouldWrite: true,
  useEcs: true,
};
