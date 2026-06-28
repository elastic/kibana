/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { isAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
<<<<<<< HEAD
import { createInferenceProviderError, createInferenceRequestError } from '@kbn/inference-common';
=======
>>>>>>> 9.4
import { convertError, isRecoverableError } from './errors';

describe('errors', () => {
  describe('convertError', () => {
<<<<<<< HEAD
    describe('InferenceTaskProviderError', () => {
      it.each([401, 403, 404, 410, 502])('propagates status %i as connectorError', (status) => {
        const message = `Received an unsuccessful status code for request from inference entity id [some-id] status [${status}]. Error message: [...]`;
        const err = createInferenceProviderError(message, { status });
=======
    describe('connector errors with "Status code: XXX. Message:" format', () => {
      it('propagates 401 as connectorError with statusCode 401', () => {
        const message =
          'Error calling connector: Status code: 401. Message: Unauthorized API Error - No cookie auth credentials found';
        const err = new Error(message);
>>>>>>> 9.4
        const converted = convertError(err);

        expect(isAgentExecutionError(converted)).toBe(true);
        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.connectorError);
<<<<<<< HEAD
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
=======
        expect('statusCode' in converted.meta ? converted.meta.statusCode : undefined).toBe(401);
        expect(converted.message).toBe(message);
      });

      it('propagates 403 as connectorError with statusCode 403', () => {
        const message =
          'Error calling connector: Status code: 403. Message: Organization is not authorized to access any resource';
        const err = new Error(message);
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.connectorError);
        expect('statusCode' in converted.meta ? converted.meta.statusCode : undefined).toBe(403);
        expect(converted.message).toBe(message);
      });

      it('propagates 404 as connectorError with statusCode 404', () => {
        const message = 'Error calling connector: Status code: 404. Message: Not found';
        const err = new Error(message);
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.connectorError);
        expect('statusCode' in converted.meta ? converted.meta.statusCode : undefined).toBe(404);
      });

      it('propagates 502 as connectorError with statusCode 502', () => {
        const message =
          'Error calling connector: Status code: 502. Message: Bad Gateway - upstream unavailable';
        const err = new Error(message);
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.connectorError);
        expect('statusCode' in converted.meta ? converted.meta.statusCode : undefined).toBe(502);
      });
    });

    describe('ES inference API errors with "status [XXX]" format', () => {
      it('propagates 403 from an inference entity error', () => {
        const message =
          'Error calling connector: event: error\ndata: {"error":{"code":"forbidden","message":"Received an unsuccessful status code for request from inference entity id [.gp-llm-v2-chat_completion] status [403]. Error message: [Organization is not authorized to access any resource]","type":"error"}}';
        const err = new Error(message);
        const converted = convertError(err);

        expect(isAgentExecutionError(converted)).toBe(true);
        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.connectorError);
        expect('statusCode' in converted.meta ? converted.meta.statusCode : undefined).toBe(403);
        expect(converted.message).toBe(message);
      });

      it('propagates 401 from an inference authentication error', () => {
        const message =
          'Error calling connector: Received an authentication error status code for request from inference entity id [openai-chat_completion-uuid] status [401]. Error message: [Incorrect API key provided]';
        const err = new Error(message);
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.connectorError);
        expect('statusCode' in converted.meta ? converted.meta.statusCode : undefined).toBe(401);
      });

      it('returns unknownError when inference status code is outside 4xx/5xx range', () => {
        const message = 'Error calling connector: status [200] for inference entity id [some-id]';
        const err = new Error(message);
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.unknownError);
        expect(
          'statusCode' in converted.meta ? converted.meta.statusCode : undefined
        ).toBeUndefined();
      });
    });

    describe('non-connector and unparseable errors', () => {
      it('returns unknownError for generic errors without connector prefix', () => {
>>>>>>> 9.4
        const err = new Error('Something went wrong');
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.unknownError);
        expect(
          'statusCode' in converted.meta ? converted.meta.statusCode : undefined
        ).toBeUndefined();
        expect(converted.message).toBe('Something went wrong');
      });
<<<<<<< HEAD
=======

      it('returns unknownError when message has "Error calling connector:" but no parseable status', () => {
        const message = 'Error calling connector: something went wrong';
        const err = new Error(message);
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.unknownError);
        expect(
          'statusCode' in converted.meta ? converted.meta.statusCode : undefined
        ).toBeUndefined();
      });

      it('returns unknownError when status code is outside 4xx/5xx range', () => {
        const message = 'Error calling connector: Status code: 200. Message: OK';
        const err = new Error(message);
        const converted = convertError(err);

        expect(converted.meta.errCode).toBe(AgentExecutionErrorCode.unknownError);
        expect(
          'statusCode' in converted.meta ? converted.meta.statusCode : undefined
        ).toBeUndefined();
      });
>>>>>>> 9.4
    });
  });

  describe('isRecoverableError', () => {
    it('returns false for connectorError so it is not retried as recoverable', () => {
<<<<<<< HEAD
      const err = createInferenceProviderError('upstream failure', { status: 401 });
=======
      const message = 'Error calling connector: Status code: 401. Message: Unauthorized API Error';
      const err = new Error(message);
>>>>>>> 9.4
      const converted = convertError(err);

      expect(isRecoverableError(converted)).toBe(false);
    });
  });
});
