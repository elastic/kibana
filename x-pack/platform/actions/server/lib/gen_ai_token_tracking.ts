/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough, Readable } from 'stream';
import { Logger } from '@kbn/logging';
import { getTokenCountFromBedrockInvoke } from './get_token_count_from_bedrock_invoke';
import { ActionTypeExecutorRawResult } from '../../common';
import { getTokenCountFromOpenAIStream } from './get_token_count_from_openai_stream';
import { getTokenCountFromInvokeStream, InvokeBody } from './get_token_count_from_invoke_stream';

interface OwnProps {
  actionTypeId: string;
  logger: Logger;
  result: ActionTypeExecutorRawResult<unknown>;
  validatedParams: Record<string, unknown>;
}
/*
 * Calculates the total, prompt, and completion token counts from different types of responses.
 * It handles both streamed and non-streamed responses from OpenAI and Bedrock.
 * It returns null if it cannot calculate the token counts.
 * @param actionTypeId the action type id
 * @param logger the logger
 * @param result the result from the action executor
 * @param validatedParams the validated params from the action executor
 */
export const getGenAiTokenTracking = async ({
  actionTypeId,
  logger,
  result,
  validatedParams,
}: OwnProps): Promise<{
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
} | null> => {
  // this is a streamed OpenAI or Bedrock response, using the subAction invokeStream to stream the response as a simple string
  if (validatedParams.subAction === 'invokeStream' && result.data instanceof Readable) {
    try {
      const { total, prompt, completion } = await getTokenCountFromInvokeStream({
        responseStream: result.data.pipe(new PassThrough()),
        actionTypeId,
        body: (validatedParams as { subActionParams: InvokeBody }).subActionParams,
        logger,
      });
      return {
        total_tokens: total,
        prompt_tokens: prompt,
        completion_tokens: completion,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from Invoke Stream subaction streaming response');
      logger.error(e);
    }
  }

  // this is a streamed OpenAI response, which did not use the subAction invokeStream
  if (actionTypeId === '.gen-ai' && result.data instanceof Readable) {
    try {
      const { total, prompt, completion } = await getTokenCountFromOpenAIStream({
        responseStream: result.data.pipe(new PassThrough()),
        body: (validatedParams as { subActionParams: { body: string } }).subActionParams.body,
        logger,
      });
      return {
        total_tokens: total,
        prompt_tokens: prompt,
        completion_tokens: completion,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from streaming response');
      logger.error(e);
    }
  }

  // this is a non-streamed OpenAI response, which comes with the usage object
  if (actionTypeId === '.gen-ai') {
    const data = result.data as unknown as {
      usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    if (data.usage == null) {
      logger.error('Response did not contain usage object');
      return null;
    }
    return {
      total_tokens: data.usage?.total_tokens ?? 0,
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    };
  }

  // this is a non-streamed Bedrock response
  if (
    actionTypeId === '.bedrock' &&
    (validatedParams.subAction === 'run' || validatedParams.subAction === 'test')
  ) {
    try {
      const { total, prompt, completion } = await getTokenCountFromBedrockInvoke({
        response: (
          result.data as unknown as {
            completion: string;
          }
        ).completion,
        body: (validatedParams as { subActionParams: { body: string } }).subActionParams.body,
      });

      return {
        total_tokens: total,
        prompt_tokens: prompt,
        completion_tokens: completion,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from Bedrock invoke response');
      logger.error(e);
    }
  }

  // this is a non-streamed Bedrock response used by security solution
  if (actionTypeId === '.bedrock' && validatedParams.subAction === 'invokeAI') {
    try {
      const { total, prompt, completion } = await getTokenCountFromBedrockInvoke({
        response: (
          result.data as unknown as {
            message: string;
          }
        ).message,
        body: JSON.stringify({
          prompt: (validatedParams as { subActionParams: { messages: Array<{ content: string }> } })
            .subActionParams.messages[0].content,
        }),
      });

      return {
        total_tokens: total,
        prompt_tokens: prompt,
        completion_tokens: completion,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from Bedrock invoke response');
      logger.error(e);
    }
  }
  return null;
};

export const shouldTrackGenAiToken = (actionTypeId: string) =>
  actionTypeId === '.gen-ai' || actionTypeId === '.bedrock';
