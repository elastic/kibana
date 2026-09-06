/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools } from '@kbn/agent-builder-common';
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
      skills: [],
      actions: [],
      answerActions: [],
      cycleLimit: 1,
      experimentalFeatures: { bash: false, skills: false },
      toolManager: {
        getExecutable: jest.fn().mockReturnValue(undefined),
      } as any,
      resultTransformer: jest.fn(),
    } as any;

    const messages = await getStructuredAnswerPrompt(params);

    const systemMessage = (messages[0] as ['system', string])[1];
    expect(systemMessage).not.toContain('Current date');
    expect(convertPreviousRounds).toHaveBeenCalledWith(
      expect.objectContaining({ conversationTimestamp: now })
    );
  });

  it('includes the static attachment tools guidance but no dynamic (conversation-specific) attachment content when tools are granted', async () => {
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
      skills: [],
      actions: [],
      answerActions: [],
      cycleLimit: 1,
      experimentalFeatures: { bash: false, skills: false },
      toolManager: {
        getExecutable: jest.fn((id: string) =>
          id === attachmentTools.read ? ({ id } as any) : undefined
        ),
      } as any,
      resultTransformer: jest.fn(),
    } as any;

    const messages = await getStructuredAnswerPrompt(params);
    const systemMessage = (messages[0] as ['system', string])[1];

    // Static guidance stays in the system prompt when attachment tools are selected.
    expect(systemMessage).toContain('MUST use the attachment tools');
    expect(systemMessage).toContain('attachment_read');

    // Dynamic, conversation-specific content must never be in the system prompt —
    // it's rendered inline in the per-round messages instead (see to_langchain_messages.ts).
    expect(systemMessage).not.toContain('## ATTACHMENT TYPES');
    expect(systemMessage).not.toContain('## Conversation Attachments');
    expect(systemMessage).not.toMatch(/attachment_id="/);
  });

  it('omits attachment tools guidance when no attachments.* tools are selected', async () => {
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
      skills: [],
      actions: [],
      answerActions: [],
      cycleLimit: 1,
      experimentalFeatures: { bash: false, skills: false },
      toolManager: {
        getExecutable: jest.fn().mockReturnValue(undefined),
      } as any,
      resultTransformer: jest.fn(),
    } as any;

    const messages = await getStructuredAnswerPrompt(params);
    const systemMessage = (messages[0] as ['system', string])[1];

    expect(systemMessage).not.toContain('MUST use the attachment tools');
    expect(systemMessage).not.toContain('attachment_read');
  });
});
