/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Trigger } from '../../../../../src/plugins/ui_actions/public';

export const SAMPLE_CANVAS_ELEMENT_CLICK_TRIGGER = 'SAMPLE_CANVAS_ELEMENT_CLICK_TRIGGER';

export const sampleCanvasElementClickTrigger: Trigger<'SAMPLE_CANVAS_ELEMENT_CLICK_TRIGGER'> = {
  id: SAMPLE_CANVAS_ELEMENT_CLICK_TRIGGER,
  title: 'Canvas element click',
  description: 'Sample trigger, which represents a click in Canvas app on an element.',
};

declare module '../../../../../src/plugins/ui_actions/public' {
  export interface TriggerContextMapping {
    [SAMPLE_CANVAS_ELEMENT_CLICK_TRIGGER]: SampleCanvasElementClickContext;
  }
}

export interface SampleCanvasElementClickContext {
  workpadId: string;
  elementId: string;
}

export const sampleCanavsElementClickContext: SampleCanvasElementClickContext = {
  workpadId: '123',
  elementId: '456',
};
