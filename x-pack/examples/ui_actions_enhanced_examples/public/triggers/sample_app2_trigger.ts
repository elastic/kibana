/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Trigger } from '../../../../../src/plugins/ui_actions/public';

export const SAMPLE_APP2_CLICK_TRIGGER = 'SAMPLE_APP2_CLICK_TRIGGER';

export const sampleApp2ClickTrigger: Trigger<'SAMPLE_APP2_CLICK_TRIGGER'> = {
  id: SAMPLE_APP2_CLICK_TRIGGER,
  title: 'App 2 trigger fired on click',
  description: 'Could be a click on an element in Canvas app.',
};

declare module '../../../../../src/plugins/ui_actions/public' {
  export interface TriggerContextMapping {
    [SAMPLE_APP2_CLICK_TRIGGER]: SampleApp2ClickContext;
  }
}

export interface SampleApp2ClickContext {
  workpadId: string;
  elementId: string;
}

export const sampleApp2ClickContext: SampleApp2ClickContext = {
  workpadId: '123',
  elementId: '456',
};
