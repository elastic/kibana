/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
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
        logger: loggerMock.create(),
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
        logger: loggerMock.create(),
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
        logger: loggerMock.create(),
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
        logger: loggerMock.create(),
      })
    );

    expect(title).toBe(DEFAULT_CONVERSATION_TITLE);
  });
});

describe('generateTitle plain-text fallback', () => {
  const createFallbackChatModel = ({
    structuredInvoke,
    textInvoke,
  }: {
    structuredInvoke: jest.Mock;
    textInvoke: jest.Mock;
  }): InferenceChatModel =>
    ({
      withStructuredOutput: jest.fn().mockReturnValue({ invoke: structuredInvoke }),
      invoke: textInvoke,
    } as unknown as InferenceChatModel);

  const forcedToolChoiceError = new Error(
    'tool_choice: type "tool" and "any" are not supported for this model.'
  );

  it('does not call the fallback when the structured call succeeds', async () => {
    const structuredInvoke = jest.fn().mockResolvedValue({ title: 'Structured Title' });
    const textInvoke = jest.fn();
    const logger = loggerMock.create();

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createFallbackChatModel({ structuredInvoke, textInvoke }),
        logger,
      })
    );

    expect(title).toBe('Structured Title');
    expect(textInvoke).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses the plain-text response when the structured call fails', async () => {
    const structuredInvoke = jest.fn().mockRejectedValue(forcedToolChoiceError);
    const textInvoke = jest.fn().mockResolvedValue({ text: '  Bedrock Title Generation \n' });
    const logger = loggerMock.create();

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createFallbackChatModel({ structuredInvoke, textInvoke }),
        logger,
      })
    );

    expect(title).toBe('Bedrock Title Generation');
    expect(textInvoke).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('strips surrounding quotes from the plain-text response', async () => {
    const structuredInvoke = jest.fn().mockRejectedValue(forcedToolChoiceError);
    const textInvoke = jest.fn().mockResolvedValue({ text: ' "Quoted Title" ' });

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createFallbackChatModel({ structuredInvoke, textInvoke }),
        logger: loggerMock.create(),
      })
    );

    expect(title).toBe('Quoted Title');
  });

  it('truncates a plain-text response that exceeds the stored bound', async () => {
    const structuredInvoke = jest.fn().mockRejectedValue(forcedToolChoiceError);
    const textInvoke = jest.fn().mockResolvedValue({ text: `"${'a'.repeat(1500)}"` });

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createFallbackChatModel({ structuredInvoke, textInvoke }),
        logger: loggerMock.create(),
      })
    );

    expect(title).toBe('a'.repeat(CONVERSATION_TITLE_MAX_LENGTH));
  });

  it('returns the existing conversation title when both calls fail', async () => {
    const structuredInvoke = jest.fn().mockRejectedValue(forcedToolChoiceError);
    const textInvoke = jest.fn().mockRejectedValue(new Error('llm unavailable'));
    const logger = loggerMock.create();

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createFallbackChatModel({ structuredInvoke, textInvoke }),
        logger,
      })
    );

    expect(title).toBe(DEFAULT_CONVERSATION_TITLE);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('returns the existing conversation title when the fallback returns empty text', async () => {
    const structuredInvoke = jest.fn().mockRejectedValue(forcedToolChoiceError);
    const textInvoke = jest.fn().mockResolvedValue({ text: ' "" ' });

    const title = await firstValueFrom(
      generateTitle({
        nextInput,
        conversation: createConversation(),
        chatModel: createFallbackChatModel({ structuredInvoke, textInvoke }),
        logger: loggerMock.create(),
      })
    );

    expect(title).toBe(DEFAULT_CONVERSATION_TITLE);
  });
});
