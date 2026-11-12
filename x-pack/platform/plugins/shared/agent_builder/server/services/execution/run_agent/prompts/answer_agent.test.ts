/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getStructuredAnswerPrompt } from './answer_agent';
import { attachmentToolsUnavailableNotice } from './utils/attachments';
import { prepareMessages } from '../utils/to_langchain_messages';

jest.mock('../utils/to_langchain_messages', () => ({
  ...jest.requireActual('../utils/to_langchain_messages'),
  prepareMessages: jest.fn().mockResolvedValue([['human', 'history']]),
}));

describe('getStructuredAnswerPrompt', () => {
  const now = new Date().toISOString();

  it('does not render the current date in the system message and forwards conversationTimestamp', async () => {
    const params = {
      conversationTimestamp: now,
      processedConversation: {
        timeline: [],
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
        capabilities: { attachmentTools: true },
      },
      skills: [],
      run: {
        steps: [],
        renderState: {},
        pendingToolCallIds: [],
        retryNotices: [],
        cycleLimit: 1,
      },
      experimentalFeatures: { bash: false, skills: false },
      toolManager: {} as any,
      resultTransformer: jest.fn(),
    } as any;

    const messages = await getStructuredAnswerPrompt(params);

    const systemMessage = (messages[0] as ['system', string])[1];
    expect(systemMessage).not.toContain('Current date');
    expect(prepareMessages).toHaveBeenCalledWith(
      expect.objectContaining({ conversationTimestamp: now })
    );
  });

  it('includes the static attachment tools guidance but no dynamic (conversation-specific) attachment content', async () => {
    const params = {
      conversationTimestamp: now,
      processedConversation: {
        timeline: [],
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
        capabilities: { attachmentTools: true },
      },
      skills: [],
      run: {
        steps: [],
        renderState: {},
        pendingToolCallIds: [],
        retryNotices: [],
        cycleLimit: 1,
      },
      experimentalFeatures: { bash: false, skills: false },
      toolManager: {} as any,
      resultTransformer: jest.fn(),
    } as any;

    const messages = await getStructuredAnswerPrompt(params);
    const systemMessage = (messages[0] as ['system', string])[1];

    // Static guidance stays in the system prompt.
    expect(systemMessage).toContain('MUST use the attachment tools');
    expect(systemMessage).toContain('attachment_read');

    // Dynamic, conversation-specific content must never be in the system prompt —
    // it's rendered inline in the per-round messages instead (see to_langchain_messages.ts).
    expect(systemMessage).not.toContain('## ATTACHMENT TYPES');
    expect(systemMessage).not.toContain('## Conversation Attachments');
    expect(systemMessage).not.toMatch(/attachment_id="/);
  });

  describe('attachment_tools capability', () => {
    const systemPrompt = async (attachmentTools: boolean) => {
      const messages = await getStructuredAnswerPrompt({
        conversationTimestamp: now,
        processedConversation: {
          timeline: [],
          nextInput: { message: '', attachments: [] },
          attachments: [],
          attachmentTypes: [],
          attachmentStateManager: createAttachmentStateManager([], {
            getTypeDefinition: (type: string) => ({ id: type } as any),
          }),
        },
        configuration: { instructions: '', capabilities: { attachmentTools } },
        skills: [],
        run: {
          steps: [],
          renderState: {},
          pendingToolCallIds: [],
          retryNotices: [],
          cycleLimit: 1,
        },
        experimentalFeatures: { bash: false, skills: false },
        toolManager: {} as any,
        resultTransformer: jest.fn(),
      } as any);
      return (messages[0] as ['system', string])[1];
    };

    it('replaces the ATTACHMENTS section with the notice when off', async () => {
      const prompt = await systemPrompt(false);

      expect(prompt).toContain(attachmentToolsUnavailableNotice());
      expect(prompt).not.toContain('attachment_read(');
    });

    it('keeps the full ATTACHMENTS section when on', async () => {
      const prompt = await systemPrompt(true);

      expect(prompt).toContain('MUST use the attachment tools');
      expect(prompt).not.toContain(attachmentToolsUnavailableNotice());
    });
  });
});
