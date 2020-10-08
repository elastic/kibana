/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Trigger } from '../../../../../src/plugins/ui_actions/public';

export const SAMPLE_APP1_CLICK_TRIGGER = 'SAMPLE_APP1_CLICK_TRIGGER';

export const sampleApp1ClickTrigger: Trigger<'SAMPLE_APP1_CLICK_TRIGGER'> = {
  id: SAMPLE_APP1_CLICK_TRIGGER,
  title: 'App 1 trigger fired on click',
  description: 'Could be a click on a ML job in ML app.',
};

declare module '../../../../../src/plugins/ui_actions/public' {
  export interface TriggerContextMapping {
    [SAMPLE_APP1_CLICK_TRIGGER]: SampleApp1ClickContext;
  }
}

export interface SampleApp1ClickContext {
  job: SampleMlJob;
}

export interface SampleMlJob {
  job_id: string;
  job_type: 'anomaly_detector';
  description: string;
}
