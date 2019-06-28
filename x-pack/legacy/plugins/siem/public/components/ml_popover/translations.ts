/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const INTEGRATIONS = i18n.translate('xpack.siem.components.mlPopup.integrationTitle', {
  defaultMessage: 'Integrations',
});

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
      "View the results of machine learning jobs such as Anomalous Events, Hosts & IP's throughout the SIEM App.",
  }
);

export const CREATE_JOBS = i18n.translate('xpack.siem.components.mlPopup.createJobsTitle', {
  defaultMessage: 'Create jobs',
});

export const CREATING_JOBS = i18n.translate('xpack.siem.components.mlPopup.creatingJobsTitle', {
  defaultMessage: 'Creating jobs...',
});

export const JOB_DETAILS = i18n.translate('xpack.siem.components.mlPopup.jobDetailsTitle', {
  defaultMessage: 'Job Details',
});

export const JOB_DETAILS_TOOL_TIP = i18n.translate(
  'xpack.siem.components.mlPopup.jobDetailsToolTip',
  {
    defaultMessage:
      "Running ML Jobs can be resource intensive. Ensure your cluster's ml nodes are adequately configured before starting the jobs below.",
  }
);

export const SHOW_ALL_JOBS = i18n.translate('xpack.siem.components.mlPopup.showAllJobs', {
  defaultMessage: 'Show all SIEM jobs',
});

export const SHOW_SIEM_JOBS = i18n.translate('xpack.siem.components.mlPopup.showSiemJobsLabel', {
  defaultMessage: 'Show only embedded jobs',
});
