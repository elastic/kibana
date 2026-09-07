/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { Conversation, ConverseInput } from '@kbn/agent-builder-common';
import {
  CONVERSATION_TITLE_MAX_LENGTH,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import { generateTitle } from './generate_title';

const createChatModel = (invoke: jest.Mock): InferenceChatModel =>
  ({
    withStructuredOutput: jest.fn().mockReturnValue({ invoke }),
  } as unknown as InferenceChatModel);

const createConversation = (): Conversation =>
  ({
    id: 'conversation-id',
    title: DEFAULT_CONVERSATION_TITLE,
    rounds: [],
  } as unknown as Conversation);

const nextInput: ConverseInput = { message: 'generate an ultra long title, ~1500 characters' };

describe('generateTitle', () => {
  it('returns a short generated title unchanged', async () => {
    const invoke = jest.fn().mockResolvedValue({ title: 'Kibana Read-Only Role Configuration' });

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createChatModel(invoke),
      })
    );

    expect(title).toBe('Kibana Read-Only Role Configuration');
  });

  it('truncates a generated title that exceeds the stored bound', async () => {
    const invoke = jest.fn().mockResolvedValue({ title: 'a'.repeat(1500) });

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createChatModel(invoke),
      })
    );

    expect(title).toHaveLength(CONVERSATION_TITLE_MAX_LENGTH);
    expect(title).toBe('a'.repeat(CONVERSATION_TITLE_MAX_LENGTH));
  });

  it('trims whitespace left at the truncation boundary', async () => {
    const invoke = jest
      .fn()
      .mockResolvedValue({ title: `${'a'.repeat(CONVERSATION_TITLE_MAX_LENGTH - 1)}   trailing` });

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createChatModel(invoke),
      })
    );

    expect(title).toBe('a'.repeat(CONVERSATION_TITLE_MAX_LENGTH - 1));
    expect(title.length).toBeLessThanOrEqual(CONVERSATION_TITLE_MAX_LENGTH);
  });

  it('falls back to the existing conversation title when generation fails', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('llm unavailable'));

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createChatModel(invoke),
      })
    );

    expect(title).toBe(DEFAULT_CONVERSATION_TITLE);
  });
});
