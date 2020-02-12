/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const JOB_CREATED_SUCCESS_TITLE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreatedNotificationTitle',
  {
    defaultMessage: 'Job successfully created',
  }
);

export const JOB_CREATED_SUCCESS_MESSAGE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreatedNotificationText',
  {
    defaultMessage:
      'The analysis is now running for response duration chart. It might take a while before results are added to the response times graph.',
  }
);

export const JOB_CREATION_FAILED = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreationFailedNotificationTitle',
  {
    defaultMessage: 'Job creation failed',
  }
);

export const JOB_CREATION_FAILED_MESSAGE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreationFailedNotificationText',
  {
    defaultMessage:
      'Your current license may not allow for creating machine learning jobs, or this job may already exist.',
  }
);

export const VIEW_JOB = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreatedNotificationText.viewJobLinkText',
  {
    defaultMessage: 'View job',
  }
);
