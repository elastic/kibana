/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/common';
import { RuleTypeState } from '@kbn/alerting-plugin/server';
import { StackAlert } from '@kbn/alerts-as-data-utils';
import type { DatasetQualityRuleParamsV1 } from '@kbn/response-ops-rule-params/dataset_quality';
import { ALERT_NAMESPACE } from '@kbn/rule-data-utils';
import { THRESHOLD_MET_GROUP } from '../../common/alerting/constants';

export type DatasetQualityRuleParams = DatasetQualityRuleParamsV1;
export type DatasetQualityRuleTypeState = RuleTypeState;
export type DatasetQualityAlertState = AlertState;
export type DatasetQualityAlertContext = AlertContext;
export type DatasetQualityAllowedActionGroups = ActionGroupIdsOf<typeof THRESHOLD_MET_GROUP>;
export type DatasetQualityAlert = Omit<
  StackAlert,
  'kibana.alert.evaluation.threshold' | 'kibana.alert.evaluation.value'
> & {
  'kibana.alert.evaluation.threshold'?: string | number | null;
  'kibana.alert.evaluation.values'?: string | number | null;
};

export const ALERT_TITLE = `${ALERT_NAMESPACE}.title` as const;
// kibana.alert.evaluation.conditions - human readable string that shows the conditions set by the user
export const ALERT_EVALUATION_CONDITIONS = `${ALERT_NAMESPACE}.evaluation.conditions` as const;

export interface AdditionalContext {
  [x: string]: any;
}

export type TimeUnitChar = 's' | 'm' | 'h' | 'd';
