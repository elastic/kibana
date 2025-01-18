/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { encode } from 'gpt-tokenizer';
import { Stream } from 'openai/streaming';
import { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/chat/completions';

export interface InvokeAsyncIteratorBody {
  messages: ChatCompletionMessageParam[];
}

/**
 * Takes the OpenAI and Bedrock `invokeStream` sub action response stream and the request messages array as inputs.
 * Uses gpt-tokenizer encoding to calculate the number of tokens in the prompt and completion parts of the response stream
 * Returns an object containing the total, prompt, and completion token counts.
 * @param streamIterable the response iterator from the `invokeAsyncIterator` sub action
 * @param body the request messages array
 * @param logger the logger
 */
export async function getTokenCountFromInvokeAsyncIterator({
  streamIterable,
  body,
  logger,
}: {
  streamIterable: Stream<ChatCompletionChunk>;
  body: InvokeAsyncIteratorBody;
  logger: Logger;
}): Promise<{
  total: number;
  prompt: number;
  completion: number;
}> {
  const chatCompletionRequest = body;

  // per https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  const promptTokens = encode(
    chatCompletionRequest.messages
      .map(
        (msg) =>
          `<|start|>${msg.role}\n${msg.content}\n${
            'name' in msg
              ? msg.name
              : 'function_call' in msg && msg.function_call
              ? msg.function_call.name + '\n' + msg.function_call.arguments
              : ''
          }<|end|>`
      )
      .join('\n')
  ).length;

  const parsedResponse = await parseOpenAIStream(streamIterable, logger);

  const completionTokens = encode(parsedResponse).length;
  return {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };
}

type StreamParser = (
  streamIterable: Stream<ChatCompletionChunk>,
  logger: Logger
) => Promise<string>;

const parseOpenAIStream: StreamParser = async (streamIterable, logger) => {
  let responseBody: string = '';
  try {
    for await (const data of streamIterable) {
      if (!data) continue;

      const choice = data?.choices?.[0];
      if (!choice) continue;

      const { delta } = choice;
      if (!delta) continue;
      const chunk = delta.content ?? '';

      if (typeof chunk !== 'string') {
        logger.warn('Received non-string content from OpenAI. This is currently not supported.');
        continue;
      }
      responseBody += chunk;
    }
  } catch (e) {
    logger.error('An error occurred while calculating streaming response tokens');
    logger.error(e);
  }

  return responseBody;
};
