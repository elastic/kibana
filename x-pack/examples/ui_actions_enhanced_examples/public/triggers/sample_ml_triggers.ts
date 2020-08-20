/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Trigger } from '../../../../../src/plugins/ui_actions/public';

export const SAMPLE_ML_JOB_CLICK_TRIGGER = 'SAMPLE_ML_JOB_CLICK_TRIGGER';

export const sampleMlJobClickTrigger: Trigger<'SAMPLE_ML_JOB_CLICK_TRIGGER'> = {
  id: SAMPLE_ML_JOB_CLICK_TRIGGER,
  title: 'ML job click',
  description: 'Sample trigger, which represents a click in ML app on an ML job.',
};

declare module '../../../../../src/plugins/ui_actions/public' {
  export interface TriggerContextMapping {
    [SAMPLE_ML_JOB_CLICK_TRIGGER]: SampleMlJobClickContext;
  }
}

export interface SampleMlJobClickContext {
  job: SampleMlJob;
}

export interface SampleMlJob {
  job_id: string;
  job_type: 'anomaly_detector';
  description: string;
}
