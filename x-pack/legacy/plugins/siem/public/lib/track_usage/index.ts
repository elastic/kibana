/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import {
  createUiStatsReporter,
  METRIC_TYPE,
} from '../../../../../../../src/legacy/core_plugins/ui_metric/public';
import { APP_ID } from '../../../common/constants';

export const trackUiAction = createUiStatsReporter(APP_ID);
export { METRIC_TYPE };

export enum TELEMETRY_EVENT {
  // ML
  SIEM_JOB_ENABLED = 'siem_job_enabled',
  SIEM_JOB_DISABLED = 'siem_job_disabled',
  CUSTOM_JOB_ENABLED = 'custom_job_enabled',
  CUSTOM_JOB_DISABLED = 'custom_job_disabled',
  JOB_ENABLE_FAILURE = 'job_enable_failure',
  JOB_DISABLE_FAILURE = 'job_disable_failure',

  // Timeline
  TIMELINE_OPENED = 'open_timeline',

  // UI Interactions
  TAB_CLICKED = 'tab_',
}
