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

export const ENABLE_ANOMALY_DETECTION = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.enableAnomalyDetectionTitle',
  {
    defaultMessage: 'Enable anomaly detection',
  }
);

export const JOB_ALREADY_EXIST = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.callout.jobExistsTitle',
  {
    defaultMessage: 'Job already exists',
  }
);

export const VIEW_EXISTING_JOB = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.callout.jobExistsDescription.viewJobLinkText',
  {
    defaultMessage: 'View existing job',
  }
);

export const ML_MANAGEMENT_PAGE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.manageMLJobDescription.mlJobsPageLinkText',
  {
    defaultMessage: 'Machine Learning jobs management page',
  }
);

export const TAKE_SOME_TIME_TEXT = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.manageMLJobDescription.noteText',
  {
    defaultMessage: 'Note: It might take a few minutes for the job to begin calculating results.',
  }
);

export const CREATE_NEW_JOB = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.createNewJobButtonLabel',
  {
    defaultMessage: 'Create new job',
  }
);

export const DELETE_JOB = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.deleteJobButtonLabel',
  {
    defaultMessage: 'Delete Job',
  }
);

export const CREAT_ML_JOB_DESC = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.createMLJobDescription',
  {
    defaultMessage: `Here you can create a machine learning job to calculate anomaly scores on durations for Uptime Monitor.
              Once enabled, The monitor duration chart on details page will show the expected bounds and annotate
              the graph once the anomaly score is >= 75.`,
  }
);

export const ML_JOB_RUNNING = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.callout.jobExistsDescription',
  {
    defaultMessage: 'There is currently a job running for Monitor duration chart.',
  }
);
