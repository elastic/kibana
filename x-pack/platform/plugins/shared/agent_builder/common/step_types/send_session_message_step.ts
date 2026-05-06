/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

export const SendSessionMessageStepTypeId = 'ai.send_session_message';

export const InputSchema = z.object({
  session_id: z.string().describe('ID of the standing session to send the message to.'),
  message: z.string().describe('Message to inject into the session as a new round.'),
});

export const OutputSchema = z.object({
  status: z
    .enum(['injected', 'queued'])
    .describe('Whether the message started a new round immediately or was queued.'),
  message_id: z.string().describe('Unique ID assigned to this message.'),
});

export type SendSessionMessageStepInputSchema = typeof InputSchema;
export type SendSessionMessageStepOutputSchema = typeof OutputSchema;

export const sendSessionMessageStepCommonDefinition: CommonStepDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  id: SendSessionMessageStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.stepTypes.sendSessionMessage.label', {
    defaultMessage: 'Send message to standing session',
  }),
  description: i18n.translate('xpack.agentBuilder.stepTypes.sendSessionMessage.description', {
    defaultMessage: 'Inject a message into a standing session, starting a new agent round.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.stepTypes.sendSessionMessage.documentation.details',
      {
        defaultMessage:
          'Injects a text message into a standing session. If the session is idle, a new round starts immediately. If active, the message is queued.',
      }
    ),
    examples: [],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
