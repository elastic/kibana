/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getResearchAgentPrompt } from './research_agent';
import { convertPreviousRounds } from '../utils/to_langchain_messages';

jest.mock('../utils/to_langchain_messages', () => ({
  convertPreviousRounds: jest.fn().mockResolvedValue([['human', 'history']]),
}));

describe('getResearchAgentPrompt', () => {
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
      cycleLimit: 1,
      experimentalFeatures: { bash: false, skills: false },
      toolManager: {} as any,
      resultTransformer: jest.fn(),
    } as any;

    const messages = await getResearchAgentPrompt(params);

    const systemMessage = (messages[0] as ['system', string])[1];
    expect(systemMessage).not.toContain('Current date');
    expect(convertPreviousRounds).toHaveBeenCalledWith(
      expect.objectContaining({ conversationTimestamp: now })
    );
  });

  it('includes the static attachment tools guidance but no dynamic (conversation-specific) attachment content', async () => {
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
      cycleLimit: 1,
      experimentalFeatures: { bash: false, skills: false },
      toolManager: {} as any,
      resultTransformer: jest.fn(),
    } as any;

    const messages = await getResearchAgentPrompt(params);
    const systemMessage = (messages[0] as ['system', string])[1];

    // Static guidance stays in the system prompt.
    expect(systemMessage).toContain('MUST use the attachment tools');
    expect(systemMessage).toContain('attachment_read');
    expect(systemMessage).toContain('INLINE ATTACHMENT RENDERING');

    // Dynamic, conversation-specific content must never be in the system prompt —
    // it's rendered inline in the per-round messages instead (see to_langchain_messages.ts).
    expect(systemMessage).not.toContain('## ATTACHMENT TYPES');
    expect(systemMessage).not.toContain('## Conversation Attachments');
    expect(systemMessage).not.toMatch(/attachment_id="/);
  });
});
