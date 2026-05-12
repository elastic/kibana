/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  BEFORE_PROMPT_SEND_TRIGGER_ID,
  AFTER_COMPLETION_TRIGGER_ID,
  beforePromptSendEventSchema,
  afterCompletionEventSchema,
} from '@kbn/workflows-extensions/common';

export const beforePromptSendPublicTriggerDefinition: PublicTriggerDefinition = {
  id: BEFORE_PROMPT_SEND_TRIGGER_ID,
  eventSchema: beforePromptSendEventSchema,
  title: 'Before prompt send',
  description:
    'Fires before an LLM prompt is sent. Use to transform messages or apply anonymization.',
};

export const afterCompletionPublicTriggerDefinition: PublicTriggerDefinition = {
  id: AFTER_COMPLETION_TRIGGER_ID,
  eventSchema: afterCompletionEventSchema,
  title: 'After completion',
  description: 'Fires after an LLM response is received. Use to transform or audit the response.',
};
