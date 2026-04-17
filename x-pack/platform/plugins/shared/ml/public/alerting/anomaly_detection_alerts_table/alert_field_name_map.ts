/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALERT_DURATION, ALERT_RULE_NAME, ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_SCORE,
  ALERT_ANOMALY_TIMESTAMP,
} from '@kbn/ml-common-constants/alerts';

export const alertFieldNameMap = Object.freeze<Record<string, string>>({
  [ALERT_RULE_NAME]: i18n.translate('xpack.ml.alertsTable.columns.ruleName', {
    defaultMessage: 'Rule name',
  }),
  [ALERT_STATUS]: i18n.translate('xpack.ml.alertsTable.columns.status', {
    defaultMessage: 'Status',
  }),
  [ALERT_ANOMALY_DETECTION_JOB_ID]: i18n.translate('xpack.ml.alertsTable.columns.jobId', {
    defaultMessage: 'Job ID',
  }),
  [ALERT_ANOMALY_SCORE]: i18n.translate('xpack.ml.alertsTable.columns.anomalyScore', {
    defaultMessage: 'Latest anomaly score',
  }),
  [ALERT_ANOMALY_TIMESTAMP]: i18n.translate('xpack.ml.alertsTable.columns.anomalyTime', {
    defaultMessage: 'Latest anomaly time',
  }),
  [ALERT_DURATION]: i18n.translate('xpack.ml.alertsTable.columns.duration', {
    defaultMessage: 'Duration',
  }),
  [ALERT_START]: i18n.translate('xpack.ml.alertsTable.columns.start', {
    defaultMessage: 'Start time',
  }),
});
