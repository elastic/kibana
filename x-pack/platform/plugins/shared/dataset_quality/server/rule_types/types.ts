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
import { i18n } from '@kbn/i18n';
import type { DegradedDocsRuleParams } from '@kbn/response-ops-rule-params/degraded_docs';

export type DatasetQualityRuleParams = DegradedDocsRuleParams;
export type DatasetQualityRuleTypeState = RuleTypeState;
export type DatasetQualityAlertState = AlertState;
export type DatasetQualityAlertContext = AlertContext;
export type DatasetQualityAllowedActionGroups = ActionGroupIdsOf<typeof THRESHOLD_MET_GROUP>;
export type DatasetQualityAlert = Omit<StackAlert, 'kibana.alert.evaluation.threshold'> & {
  'kibana.alert.evaluation.threshold'?: string | number | null;
  'kibana.alert.grouping'?: Record<string, string>;
};

export interface AdditionalContext {
  [x: string]: any;
}

export const DATASET_QUALITY_REGISTRATION_CONTEXT = 'dataset.quality';

const THRESHOLD_MET_GROUP_ID = 'threshold_met';
export const THRESHOLD_MET_GROUP = {
  id: THRESHOLD_MET_GROUP_ID,
  name: i18n.translate('xpack.datasetQuality.alerting.action.thresholdMet', {
    defaultMessage: 'Threshold met',
  }),
};

export const MISSING_VALUE = i18n.translate('xpack.datasetQuality.alerting.missingValue', {
  defaultMessage: 'N/A',
});
