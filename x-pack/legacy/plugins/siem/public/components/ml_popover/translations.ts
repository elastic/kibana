/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const MACHINE_LEARNING = i18n.translate(
  'xpack.siem.components.mlPopup.machineLearningTitle',
  {
    defaultMessage: 'Machine Learning',
  }
);

export const ML_DESCRIPTION = i18n.translate(
  'xpack.siem.components.mlPopup.machineLearningDescription',
  {
    defaultMessage:
      "Enable to view the results of machine learning jobs such as Anomalous Events, Hosts & IP's.",
  }
);

export const JOB_DETAILS = i18n.translate('xpack.siem.components.mlPopup.jobDetailsTitle', {
  defaultMessage: 'Job Details',
});
