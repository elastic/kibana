/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filter, lastValueFrom, of, throwError } from 'rxjs';
import { ChatCompleteResponse } from '@kbn/inference-common';
import { Message, MessageRole } from '../../../../common';
import {
  TITLE_CONVERSATION_FUNCTION_NAME,
  TITLE_SYSTEM_MESSAGE,
  getGeneratedTitle,
} from './get_generated_title';
import { AssistantScope } from '@kbn/ai-assistant-common';

describe('getGeneratedTitle', () => {
  const messages: Message[] = [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        content: 'A message',
        role: MessageRole.User,
      },
    },
  ];

  function createChatCompletionResponse(content: {
    content?: string;
    function_call?: { name: string; arguments: { [key: string]: string } };
  }): ChatCompleteResponse {
    return {
      content: content.content || '',
      toolCalls: content.function_call
        ? [
            {
              toolCallId: 'test_id',
              function: {
                name: content.function_call?.name,
                arguments: content.function_call?.arguments,
              },
            },
          ]
        : [],
    };
  }

  function callGenerateTitle(
    scopes: AssistantScope[],
    ...rest: [ChatCompleteResponse[]] | [{}, ChatCompleteResponse[]]
  ) {
    const options = rest.length === 1 ? {} : rest[0];
    const chunks = rest.length === 1 ? rest[0] : rest[1];

    const chatSpy = jest.fn().mockImplementation(() => of(...chunks));

    const title$ = getGeneratedTitle({
      chat: chatSpy,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
      },
      messages,
      ...options,
      scopes,
    });

    return { chatSpy, title$ };
  }

  it('returns the given title as a string', async () => {
    const { title$ } = callGenerateTitle(
      ['observability'],
      [
        createChatCompletionResponse({
          function_call: {
            name: 'title_conversation',
            arguments: { title: 'My title' },
          },
        }),
      ]
    );

    const title = await lastValueFrom(
      title$.pipe(filter((event): event is string => typeof event === 'string'))
    );

    expect(title).toEqual('My title');
  });
  it('calls chat with the user message', async () => {
    const { chatSpy, title$ } = callGenerateTitle(
      ['observability'],
      [
        createChatCompletionResponse({
          function_call: {
            name: TITLE_CONVERSATION_FUNCTION_NAME,
            arguments: { title: 'My title' },
          },
        }),
      ]
    );

    await lastValueFrom(title$);

    const [name, params] = chatSpy.mock.calls[0];
    expect(name).toEqual('generate_title');
    expect(params.messages.length).toBe(1);
    expect(params.messages[0].message.content).toContain('A message');
  });

  it('strips quotes from the title', async () => {
    async function testTitle(title: string) {
      const { title$ } = callGenerateTitle(
        ['observability'],
        [
          createChatCompletionResponse({
            function_call: {
              name: 'title_conversation',
              arguments: { title },
            },
          }),
        ]
      );

      return await lastValueFrom(
        title$.pipe(filter((event): event is string => typeof event === 'string'))
      );
    }

    expect(await testTitle(`"My title"`)).toEqual('My title');
    expect(await testTitle(`'My title'`)).toEqual('My title');
    expect(await testTitle(`"User's request for a title"`)).toEqual(`User's request for a title`);
  });

  it('handles errors in chat and falls back to the default title', async () => {
    const chatSpy = jest
      .fn()
      .mockImplementation(() => throwError(() => new Error('Error generating title')));

    const logger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const title$ = getGeneratedTitle({
      chat: chatSpy,
      logger,
      messages,
      scopes: ['observability'],
    });

    const title = await lastValueFrom(title$);

    expect(title).toEqual('New conversation');

    expect(logger.error).toHaveBeenCalledWith('Error generating title');
  });

  it('should generate title with Elastic Observability scope when scopes include search', () => {
    const response = createChatCompletionResponse({
      function_call: {
        name: TITLE_CONVERSATION_FUNCTION_NAME,
        arguments: { title: 'My title' },
      },
    });
    const chatSpy = jest.fn().mockImplementation(() => of(response));

    const scopes = ['observability'] as AssistantScope[];
    getGeneratedTitle({
      chat: chatSpy,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
      },
      messages,
      scopes,
    });

    expect(chatSpy).toHaveBeenCalledTimes(1);
    expect(chatSpy).toHaveBeenCalledWith(
      'generate_title',
      expect.objectContaining({
        systemMessage: TITLE_SYSTEM_MESSAGE.replace(/\{scope\}/, 'Elastic Observability'),
      })
    );
  });

  it('should generate title with Elasticsearch scope when scopes include search', () => {
    const response = createChatCompletionResponse({
      function_call: {
        name: TITLE_CONVERSATION_FUNCTION_NAME,
        arguments: { title: 'My title' },
      },
    });
    const chatSpy = jest.fn().mockImplementation(() => of(response));

    const scopes = ['search'] as AssistantScope[];
    getGeneratedTitle({
      chat: chatSpy,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
      },
      messages,
      scopes,
    });

    expect(chatSpy).toHaveBeenCalledTimes(1);
    expect(chatSpy).toHaveBeenCalledWith(
      'generate_title',
      expect.objectContaining({
        systemMessage: TITLE_SYSTEM_MESSAGE.replace(/\{scope\}/, 'Elasticsearch'),
      })
    );
  });
});
