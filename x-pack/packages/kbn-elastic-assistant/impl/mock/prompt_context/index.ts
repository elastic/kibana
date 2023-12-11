/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptContext } from '../../assistant/prompt_context/types';

export const mockAlertPromptContext: PromptContext = {
  category: 'alert',
  description: 'An alert pill description',
  getPromptContext: () => Promise.resolve('alert data'),
  id: 'mock-alert-prompt-context-1',
  tooltip: 'Add this alert as context',
};

export const mockEventPromptContext: PromptContext = {
  category: 'event',
  description: 'An event pill description',
  getPromptContext: () => Promise.resolve('event data'),
  id: 'mock-event-prompt-context-1',
  tooltip: 'Add this event as context',
};

export const mockPromptContexts: PromptContext[] = [mockAlertPromptContext, mockEventPromptContext];
