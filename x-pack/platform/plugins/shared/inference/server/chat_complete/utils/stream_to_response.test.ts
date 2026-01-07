/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { ChatCompletionEvent, ChatCompletionMessageEvent } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { chunkEvent, tokensEvent, messageEvent } from '../../test_utils/chat_complete_events';
import { streamToResponse } from './stream_to_response';

describe('streamToResponse', () => {
  function fromEvents(...events: ChatCompletionEvent[]) {
    return of(...events);
  }

  it('returns a response with token count if both message and token events got emitted', async () => {
    const response = await streamToResponse(
      fromEvents(
        chunkEvent('chunk_1'),
        chunkEvent('chunk_2'),
        tokensEvent({ prompt: 1, completion: 2, total: 3 }),
        messageEvent('message')
      )
    );

    expect(response).toEqual({
      content: 'message',
      tokens: {
        completion: 2,
        prompt: 1,
        total: 3,
      },
      toolCalls: [],
    });
  });

  it('returns a response with model if present in the token event', async () => {
    const response = await streamToResponse(
      fromEvents(
        chunkEvent('chunk_1'),
        chunkEvent('chunk_2'),
        tokensEvent({ prompt: 1, completion: 2, total: 3 }, { model: 'my_model' }),
        messageEvent('message')
      )
    );

    expect(response.model).toEqual('my_model');
  });

  it('returns a response with tool calls if present', async () => {
    const someToolCall = {
      toolCallId: '42',
      function: {
        name: 'my_tool',
        arguments: {},
      },
    };
    const response = await streamToResponse(
      fromEvents(chunkEvent('chunk_1'), messageEvent('message', [someToolCall]))
    );

    expect(response).toEqual({
      content: 'message',
      toolCalls: [someToolCall],
    });
  });

  it('returns a response without token count if only message got emitted', async () => {
    const response = await streamToResponse(
      fromEvents(chunkEvent('chunk_1'), messageEvent('message'))
    );

    expect(response).toEqual({
      content: 'message',
      toolCalls: [],
    });
  });

  it('rejects an error if message event is not emitted', async () => {
    await expect(
      streamToResponse(fromEvents(chunkEvent('chunk_1'), tokensEvent()))
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"No message event found"`);
  });

  it('includes deanonymization data in the response if present', async () => {
    // Create a message event with deanonymization data
    const messageWithDeanonymization: ChatCompletionMessageEvent = {
      ...messageEvent('Your email is jorge@gmail.com'),
      deanonymized_input: [
        {
          message: {
            role: MessageRole.User,
            content: 'My email is jorge@gmail.com. What is my email?',
          },
          deanonymizations: [
            {
              start: 12,
              end: 27,
              entity: {
                value: 'jorge@gmail.com',
                class_name: 'EMAIL',
                mask: 'EMAIL_6de8d9fba5c5e60ac39395fba7ebce7c2cabd915',
              },
            },
          ],
        },
      ],
      deanonymized_output: {
        message: {
          content: 'Your email is jorge@gmail.com',
          toolCalls: [],
          role: MessageRole.Assistant,
        },
        deanonymizations: [
          {
            start: 14,
            end: 29,
            entity: {
              value: 'jorge@gmail.com',
              class_name: 'EMAIL',
              mask: 'EMAIL_6de8d9fba5c5e60ac39395fba7ebce7c2cabd915',
            },
          },
        ],
      },
    };

    const response = await streamToResponse(
      fromEvents(chunkEvent('chunk'), messageWithDeanonymization)
    );

    expect(response).toEqual({
      content: 'Your email is jorge@gmail.com',
      toolCalls: [],
      deanonymized_input: messageWithDeanonymization.deanonymized_input,
      deanonymized_output: messageWithDeanonymization.deanonymized_output,
    });
  });
});
