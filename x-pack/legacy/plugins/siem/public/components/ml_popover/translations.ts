/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ANOMALY_DETECTION = i18n.translate(
  'xpack.siem.components.mlPopup.anomalyDetectionButtonLabel',
  {
    defaultMessage: 'Anomaly detection',
  }
);

export const ANOMALY_DETECTION_TITLE = i18n.translate(
  'xpack.siem.components.mlPopup.anomalyDetectionTitle',
  {
    defaultMessage: 'Anomaly detection settings',
  }
);

export const UPGRADE_TITLE = i18n.translate('xpack.siem.components.mlPopup.upgradeTitle', {
  defaultMessage: 'Upgrade to Elastic Platinum',
});

export const UPGRADE_DESCRIPTION = i18n.translate(
  'xpack.siem.components.mlPopup.upgradeDescription',
  {
    defaultMessage:
      'In order to access SIEM’s anomaly detection features, you must be subscribed to an Elastic Platinum license. With it, you’ll have the ability to run Machine Learning jobs to view anomalous events throughout SIEM.',
  }
);

export const UPGRADE_BUTTON = i18n.translate('xpack.siem.components.mlPopup.upgradeButtonLabel', {
  defaultMessage: 'Subscription options',
});

export const FILTER_PLACEHOLDER = i18n.translate(
  'xpack.siem.components.mlPopup.filterPlaceholder',
  {
    defaultMessage: 'e.g. rare_process_linux',
  }
);

export const SHOW_ELASTIC_JOBS = i18n.translate('xpack.siem.components.mlPopup.showAllJobsLabel', {
  defaultMessage: 'Elastic jobs',
});

export const SHOW_CUSTOM_JOBS = i18n.translate('xpack.siem.components.mlPopup.showSiemJobsLabel', {
  defaultMessage: 'Custom jobs',
});

export const COLUMN_JOB_NAME = i18n.translate(
  'xpack.siem.components.mlPopup.jobsTable.jobNameColumn',
  {
    defaultMessage: 'Job name',
  }
);

export const COLUMN_RUN_JOB = i18n.translate(
  'xpack.siem.components.mlPopup.jobsTable.runJobColumn',
  {
    defaultMessage: 'Run job',
  }
);

export const NO_ITEMS_TEXT = i18n.translate(
  'xpack.siem.components.mlPopup.jobsTable.noItemsDescription',
  {
    defaultMessage: 'No SIEM Machine Learning jobs found',
  }
);

export const CREATE_CUSTOM_JOB = i18n.translate(
  'xpack.siem.components.mlPopup.jobsTable.createCustomJobButtonLabel',
  {
    defaultMessage: 'Create custom job',
  }
);

export const START_JOB_FAILURE = i18n.translate(
  'xpack.siem.components.mlPopup.errors.startJobFailureTitle',
  {
    defaultMessage: 'Start job failure',
  }
);

export const STOP_JOB_FAILURE = i18n.translate('xpack.siem.containers.errors.stopJobFailureTitle', {
  defaultMessage: 'Stop job failure',
});

export const CREATE_JOB_FAILURE = i18n.translate(
  'xpack.siem.components.mlPopup.errors.createJobFailureTitle',
  {
    defaultMessage: 'Create job failure',
  }
);
