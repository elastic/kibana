/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getStructuredAnswerPrompt } from './answer_agent';
import { convertPreviousRounds } from '../utils/to_langchain_messages';

jest.mock('../utils/to_langchain_messages', () => ({
  convertPreviousRounds: jest.fn().mockResolvedValue([['human', 'history']]),
}));

describe('getStructuredAnswerPrompt', () => {
  const now = new Date().toISOString();

  it('does not render the current date in the system message and forwards conversationTimestamp', async () => {
    const params = {
      conversationTimestamp: now,
      processedConversation: {
        previousRounds: [],
        nextInput: { message: '', attachments: [] },
        attachments: [],
        attachmentTypes: [],
        attachmentStateManager: createAttachmentStateManager([], {
          getTypeDefinition: (type: string) =>
            ({
              id: type,
              validate: (input: unknown) => ({ valid: true, data: input }),
              format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
            } as any),
        }),
      },
      configuration: {
        instructions: '',
      },
      capabilities: { visualizations: false },
      skills: [],
      actions: [],
      answerActions: [],
      cycleLimit: 1,
      experimentalFeatures: { bash: false, skills: false },
      toolManager: {} as any,
      resultTransformer: jest.fn(),
    } as any;

    const messages = await getStructuredAnswerPrompt(params);

    const systemMessage = (messages[0] as ['system', string])[1];
    expect(systemMessage).not.toContain('Current date');
    expect(convertPreviousRounds).toHaveBeenCalledWith(
      expect.objectContaining({ conversationTimestamp: now })
    );
  });
});
