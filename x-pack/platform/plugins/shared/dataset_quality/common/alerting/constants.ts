/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const DATASET_QUALITY_AAD_FIELDS = [];

export const THRESHOLD_MET_GROUP_ID = 'threshold_met';
export const THRESHOLD_MET_GROUP = {
  id: THRESHOLD_MET_GROUP_ID,
  name: i18n.translate('xpack.datasetQuality.alerting.action.thresholdMet', {
    defaultMessage: 'Threshold met',
  }),
};
