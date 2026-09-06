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
export const ALERT_ESQL_QUERY_RESULTS = `${ALERT_NAMESPACE}.esql.results` as const;
export const ALERT_ESQL_QUERY_RESULTS_TOTAL_COUNT =
  `${ALERT_NAMESPACE}.esql.results_total_count` as const;
export const ALERT_ESQL_QUERY_RESULTS_STORED_COUNT =
  `${ALERT_NAMESPACE}.esql.results_stored_count` as const;
export const ALERT_ESQL_QUERY_RESULTS_TRUNCATED =
  `${ALERT_NAMESPACE}.esql.results_truncated` as const;

export const STACK_ALERTS_AAD_CONFIG: IRuleTypeAlerts<StackAlertType> = {
  context: STACK_AAD_INDEX_NAME,
  mappings: {
    fieldMap: {
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
      [ALERT_ESQL_QUERY_RESULTS]: {
        type: 'object',
        enabled: false,
        array: true,
        required: false,
      },
      [ALERT_ESQL_QUERY_RESULTS_TOTAL_COUNT]: {
        type: 'long',
        array: false,
        required: false,
      },
      [ALERT_ESQL_QUERY_RESULTS_STORED_COUNT]: {
        type: 'long',
        array: false,
        required: false,
      },
      [ALERT_ESQL_QUERY_RESULTS_TRUNCATED]: {
        type: 'boolean',
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
