/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskErrorCode } from '@kbn/inference-common';
import { convertUpstreamError } from './convert_upstream_error';

const connectorError =
  "Status code: 400. Message: API Error: model_error - The response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry.";

const elasticInferenceError =
  'status_exception - Received an authentication error status code for request from inference entity id [openai-chat_completion-uuid] status [401]. Error message: [Incorrect API key provided]';

describe('convertUpstreamError', () => {
  it('extracts status code from a connector request error', () => {
    const error = convertUpstreamError(connectorError);
    expect(error.code).toEqual(InferenceTaskErrorCode.internalError);
    expect(error.message).toEqual(connectorError);
    expect(error.status).toEqual(400);
  });

  it('extracts status code from a ES inference chat_completion error', () => {
    const error = convertUpstreamError(elasticInferenceError);
    expect(error.code).toEqual(InferenceTaskErrorCode.internalError);
    expect(error.message).toEqual(elasticInferenceError);
    expect(error.status).toEqual(401);
  });

  it('supports errors', () => {
    const error = convertUpstreamError(new Error(connectorError));
    expect(error.code).toEqual(InferenceTaskErrorCode.internalError);
    expect(error.message).toEqual(connectorError);
    expect(error.status).toEqual(400);
  });

  it('process generic messages', () => {
    const message = 'some error message';
    const error = convertUpstreamError(message);
    expect(error.code).toEqual(InferenceTaskErrorCode.internalError);
    expect(error.message).toEqual(message);
    expect(error.status).toBe(undefined);
  });
});
