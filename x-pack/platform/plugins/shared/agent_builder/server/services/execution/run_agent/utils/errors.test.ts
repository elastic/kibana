/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { isAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { createInferenceProviderError, createInferenceRequestError } from '@kbn/inference-common';
import { convertError, isRecoverableError } from './errors';

describe('errors', () => {
  describe('convertError', () => {
    describe('InferenceTaskProviderError', () => {
      it.each([401, 403, 404, 410, 502])('propagates status %i as connectorError', (status) => {
        const message = `Received an unsuccessful status code for request from inference entity id [some-id] status [${status}]. Error message: [...]`;
        const err = createInferenceProviderError(message, { status });
        const converted = convertError(err);

        expect(isAgentExecutionError(converted)).toBe(true);
        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.connectorError);
        expect('statusCode' in converted.meta ? converted.meta.statusCode : undefined).toBe(status);
        expect(converted.message).toBe(message);
      });

      it('returns unknownError when status is missing, preserving the message', () => {
        const err = createInferenceProviderError('something went wrong');
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.unknownError);
        expect(
          'statusCode' in converted.meta ? converted.meta.statusCode : undefined
        ).toBeUndefined();
        expect(converted.message).toBe('something went wrong');
      });

      it('returns unknownError when status is outside 4xx/5xx range, preserving the message', () => {
        const err = createInferenceProviderError('unexpected status', { status: 200 });
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.unknownError);
        expect(
          'statusCode' in converted.meta ? converted.meta.statusCode : undefined
        ).toBeUndefined();
        expect(converted.message).toBe('unexpected status');
      });
    });

    describe('InferenceTaskRequestError', () => {
      it('propagates 404 when the inference endpoint cannot be resolved', () => {
        const message =
          "No connector or inference endpoint found for ID '.anthropic-claude-3.7-sonnet-chat_completion'";
        const err = createInferenceRequestError(message, 404);
        const converted = convertError(err);

        expect(isAgentExecutionError(converted)).toBe(true);
        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.connectorError);
        expect('statusCode' in converted.meta ? converted.meta.statusCode : undefined).toBe(404);
        expect(converted.message).toBe(message);
      });
    });

    describe('non-inference errors', () => {
      it('returns unknownError for generic errors', () => {
        const err = new Error('Something went wrong');
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.unknownError);
        expect(
          'statusCode' in converted.meta ? converted.meta.statusCode : undefined
        ).toBeUndefined();
        expect(converted.message).toBe('Something went wrong');
      });
    });
  });

  describe('isRecoverableError', () => {
    it('returns false for connectorError so it is not retried as recoverable', () => {
      const err = createInferenceProviderError('upstream failure', { status: 401 });
      const converted = convertError(err);

      expect(isRecoverableError(converted)).toBe(false);
    });
  });
});
