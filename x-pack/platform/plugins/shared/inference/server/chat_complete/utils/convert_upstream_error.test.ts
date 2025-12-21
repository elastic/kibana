/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionErrorCode, InferenceTaskErrorCode } from '@kbn/inference-common';
import { convertUpstreamError } from './convert_upstream_error';
import { isUserError } from '@kbn/task-manager-plugin/server/task_running';
import type { InferenceTaskProviderError } from '@kbn/inference-common';
import type { ChatCompletionContextLengthExceededError } from '@kbn/inference-common/src/chat_complete/errors';
import type { DecoratedError } from '@kbn/task-manager-plugin/server';

function isErrorWithCodeAndStatusProperties(
  error: InferenceTaskProviderError | ChatCompletionContextLengthExceededError | DecoratedError
): error is InferenceTaskProviderError | ChatCompletionContextLengthExceededError {
  return 'code' in error && 'status' in error;
}

const connectorError =
  "Status code: 400. Message: API Error: model_error - The response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry.";

const elasticInferenceError =
  'status_exception - Received an authentication error status code for request from inference entity id [openai-chat_completion-uuid] status [401]. Error message: [Incorrect API key provided]';

const userQuotaError =
  'Received a rate limit status code for request from inference entity id [openai-chat_completion-***] status [429]. Error message: [You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.]';

describe('convertUpstreamError', () => {
  it('extracts status code from a connector request error', () => {
    const error = convertUpstreamError(connectorError);
    if (isErrorWithCodeAndStatusProperties(error)) {
      expect(error.code).toEqual(InferenceTaskErrorCode.providerError);
      expect(error.message).toEqual(connectorError);
      expect(error.status).toEqual(400);
    }
  });

  it('extracts status code from a ES inference chat_completion error', () => {
    const error = convertUpstreamError(elasticInferenceError);
    if (isErrorWithCodeAndStatusProperties(error)) {
      expect(error.code).toEqual(InferenceTaskErrorCode.providerError);
      expect(error.message).toEqual(elasticInferenceError);
      expect(error.status).toEqual(401);
    }
  });

  it('supports errors', () => {
    const error = convertUpstreamError(new Error(connectorError));
    if (isErrorWithCodeAndStatusProperties(error)) {
      expect(error.code).toEqual(InferenceTaskErrorCode.providerError);
      expect(error.message).toEqual(connectorError);
      expect(error.status).toEqual(400);
    }
  });

  it('process generic messages', () => {
    const error = convertUpstreamError(userQuotaError);
    expect(isUserError(error)).toBe(true);
  });

  it('converts exceeded quota errors to user errors', () => {
    const message = 'some error message';
    const error = convertUpstreamError(message);
    if (isErrorWithCodeAndStatusProperties(error)) {
      expect(error.code).toEqual(InferenceTaskErrorCode.providerError);
      expect(error.message).toEqual(message);
      expect(error.status).toBe(undefined);
    }
  });

  describe('context length errors', () => {
    const errors = [
      [
        'OpenAI',
        'This model’s maximum context length is 4097 tokens, however you requested 5360 tokens (1360 in your prompt; 4000 for the completion)',
      ],
      ['', 'Input is too long for requested model'],
      [
        'Bedrock',
        'input length and max_tokens exceed context limit: 199926 + 21333 > 200000, decrease input length or max_tokens and try again',
      ],
      [
        'Gemini/Vertex',
        'The input token count (1125602) exceeds the maximum number of tokens allowed (1048576)',
      ],
      [
        'Cohere',
        'too many tokens: size limit exceeded by 11326 tokens. Try using shorter or fewer inputs.',
      ],
      [
        'Mistral',
        'This model’s maximum context length is 131072 tokens. However, you requested 671051 tokens (670951 in the messages, 100 in the completion). Please reduce the length of the messages or completion.',
      ],
      [
        'TogetherAI',
        'Input token count + max_tokens parameter must be less than the context length of the model being queried. Set max_tokens to a lower number.',
      ],
    ];

    for (const [provider, message] of errors) {
      it(`identifies context length error from ${provider}`, () => {
        const error = convertUpstreamError(message);
        if (isErrorWithCodeAndStatusProperties(error)) {
          expect(error.code).toEqual(ChatCompletionErrorCode.ContextLengthExceededError);
          expect(error.message).toContain(message);
          expect(error.status).toBe(undefined);
        }
      });
    }
  });
});
