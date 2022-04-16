/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Trigger } from '@kbn/ui-actions-plugin/public';

export const SAMPLE_APP2_CLICK_TRIGGER = 'SAMPLE_APP2_CLICK_TRIGGER';

export const sampleApp2ClickTrigger: Trigger = {
  id: SAMPLE_APP2_CLICK_TRIGGER,
  title: 'App 2 trigger fired on click',
  description: 'Could be a click on an element in Canvas app.',
};

export interface SampleApp2ClickContext {
  workpadId: string;
  elementId: string;
}

export const sampleApp2ClickContext: SampleApp2ClickContext = {
  workpadId: '123',
  elementId: '456',
};
