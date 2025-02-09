/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough, Readable } from 'stream';
import { Logger } from '@kbn/logging';
import { Stream } from 'openai/streaming';
import { ChatCompletionChunk } from 'openai/resources/chat/completions';
import {
  getTokensFromBedrockConverseStream,
  SmithyStream,
} from './get_token_count_from_bedrock_converse';
import {
  InvokeAsyncIteratorBody,
  getTokenCountFromInvokeAsyncIterator,
} from './get_token_count_from_invoke_async_iterator';
import { getTokenCountFromBedrockInvoke } from './get_token_count_from_bedrock_invoke';
import { ActionTypeExecutorRawResult } from '../../common';
import { getTokenCountFromOpenAIStream } from './get_token_count_from_openai_stream';
import {
  getTokenCountFromInvokeStream,
  InvokeBody,
  parseGeminiStreamForUsageMetadata,
} from './get_token_count_from_invoke_stream';

export interface TelemetryMetadata {
  pluginId?: string;
  aggregateBy?: string;
}

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
  telemetry_metadata?: TelemetryMetadata;
} | null> => {
  // this is an async iterator from the OpenAI sdk
  let telemetryMetadata: TelemetryMetadata | undefined;
  if (hasTelemetryMetadata(validatedParams.subActionParams)) {
    telemetryMetadata = validatedParams.subActionParams.telemetryMetadata;
  }
  if (validatedParams.subAction === 'invokeAsyncIterator' && actionTypeId === '.gen-ai') {
    try {
      const data = result.data as {
        consumerStream: Stream<ChatCompletionChunk>;
        tokenCountStream: Stream<ChatCompletionChunk>;
      };
      // the async interator is teed in the subaction response, double check that it has two streams
      if (data.tokenCountStream) {
        const { total, prompt, completion } = await getTokenCountFromInvokeAsyncIterator({
          streamIterable: data.tokenCountStream,
          body: (validatedParams as { subActionParams: InvokeAsyncIteratorBody }).subActionParams,
          logger,
        });
        return {
          total_tokens: total,
          prompt_tokens: prompt,
          completion_tokens: completion,
          telemetry_metadata: telemetryMetadata,
        };
      }
      logger.error(
        'Failed to calculate tokens from Invoke Async Iterator subaction streaming response - unexpected response from actions client'
      );
      return {
        total_tokens: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        telemetry_metadata: telemetryMetadata,
      };
    } catch (e) {
      logger.error(
        'Failed to calculate tokens from Invoke Async Iterator subaction streaming response'
      );
      logger.error(e);
      // silently fail and null is returned at bottom of fuction
    }
  }

  // this is a streamed Gemini response, using the subAction invokeStream to stream the response as a simple string
  if (
    validatedParams.subAction === 'invokeStream' &&
    result.data instanceof Readable &&
    actionTypeId === '.gemini'
  ) {
    try {
      const { totalTokenCount, promptTokenCount, candidatesTokenCount } =
        await parseGeminiStreamForUsageMetadata({
          responseStream: result.data.pipe(new PassThrough()),
          logger,
        });

      return {
        total_tokens: totalTokenCount,
        prompt_tokens: promptTokenCount,
        completion_tokens: candidatesTokenCount,
        telemetry_metadata: telemetryMetadata,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from Invoke Stream subaction streaming response');
      logger.error(e);
      // silently fail and null is returned at bottom of fuction
    }
  }

  // this is a streamed OpenAI or Bedrock response, using the subAction invokeStream to stream the response as a simple string
  if (
    validatedParams.subAction === 'invokeStream' &&
    result.data instanceof Readable &&
    actionTypeId !== '.gemini'
  ) {
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
        telemetry_metadata: telemetryMetadata,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from Invoke Stream subaction streaming response');
      logger.error(e);
      // silently fail and null is returned at bottom of fuction
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
        telemetry_metadata: telemetryMetadata,
      };
    } catch (e) {
      logger.error('Failed to calculate tokens from streaming response');
      logger.error(e);
      // silently fail and null is returned at bottom of fuction
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
      telemetry_metadata: telemetryMetadata,
    };
  }

  // this is a non-streamed Bedrock response
  if (
    actionTypeId === '.bedrock' &&
    (validatedParams.subAction === 'run' || validatedParams.subAction === 'test')
  ) {
    try {
      const rData = result.data as unknown as {
        completion: string;
        usage?: { input_tokens: number; output_tokens: number };
      };
      if (typeof rData.completion === 'string') {
        const { total, prompt, completion } = await getTokenCountFromBedrockInvoke({
          response: rData.completion,
          body: (validatedParams as { subActionParams: { body: string } }).subActionParams.body,
          usage: rData.usage,
        });

        return {
          total_tokens: total,
          prompt_tokens: prompt,
          completion_tokens: completion,
          telemetry_metadata: telemetryMetadata,
        };
      } else {
        logger.error('Response from Bedrock run response did not contain completion string');
        return {
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          telemetry_metadata: telemetryMetadata,
        };
      }
    } catch (e) {
      logger.error('Failed to calculate tokens from Bedrock run response');
      logger.error(e);
    }
  }

  // Process non-streamed Gemini response from `usageMetadata` object
  if (actionTypeId === '.gemini') {
    const data = result.data as unknown as {
      usageMetadata: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    if (data.usageMetadata == null) {
      logger.error('Response did not contain usage metadata object');
      return null;
    }
    return {
      total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      telemetry_metadata: telemetryMetadata,
    };
  }

  // this is a non-streamed Bedrock response used by security solution
  if (actionTypeId === '.bedrock' && validatedParams.subAction === 'invokeAI') {
    try {
      const rData = result.data as unknown as {
        message: string;
        usage?: { input_tokens: number; output_tokens: number };
      };

      if (typeof rData.message === 'string') {
        const { total, prompt, completion } = await getTokenCountFromBedrockInvoke({
          response: rData.message,
          body: JSON.stringify({
            prompt: (
              validatedParams as { subActionParams: { messages: Array<{ content: string }> } }
            ).subActionParams.messages[0].content,
          }),
          usage: rData.usage,
        });

        return {
          total_tokens: total,
          prompt_tokens: prompt,
          completion_tokens: completion,
          telemetry_metadata: telemetryMetadata,
        };
      } else {
        logger.error('Response from Bedrock invoke response did not contain message string');
        return {
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          telemetry_metadata: telemetryMetadata,
        };
      }
    } catch (e) {
      logger.error('Failed to calculate tokens from Bedrock invoke response');
      logger.error(e);
      // silently fail and null is returned at bottom of function
    }
  }

  // BedrockRuntimeClient.send response used by chat model ActionsClientChatBedrockConverse
  if (actionTypeId === '.bedrock' && validatedParams.subAction === 'bedrockClientSend') {
    const { tokenStream, usage } = result.data as unknown as {
      tokenStream?: SmithyStream;
      usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
    };
    if (tokenStream) {
      const res = await getTokensFromBedrockConverseStream(tokenStream, logger);
      return res;
    }
    if (usage) {
      return {
        total_tokens: usage.totalTokens,
        prompt_tokens: usage.inputTokens,
        completion_tokens: usage.outputTokens,
        telemetry_metadata: telemetryMetadata,
      };
    } else {
      logger.error('Response from Bedrock converse API did not contain usage object');
      return null;
    }
  }

  if (actionTypeId === '.bedrock' && validatedParams.subAction === 'invokeAIRaw') {
    const results = result.data as unknown as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    if (results?.usage) {
      const { input_tokens: inputTokens = 0, output_tokens: outputTokens = 0 } = results.usage;
      return {
        total_tokens: inputTokens + outputTokens,
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        telemetry_metadata: telemetryMetadata,
      };
    } else {
      logger.error('Response from Bedrock converse API did not contain usage object');
      return null;
    }
  }
  return null;
};

export const shouldTrackGenAiToken = (actionTypeId: string) =>
  actionTypeId === '.gen-ai' ||
  actionTypeId === '.bedrock' ||
  actionTypeId === '.gemini' ||
  actionTypeId === '.inference';

function hasTelemetryMetadata(obj: unknown): obj is { telemetryMetadata: TelemetryMetadata } {
  return obj !== null && typeof obj === 'object' && 'telemetryMetadata' in obj;
}
