/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createInferenceProviderError, createInferenceRequestError } from '@kbn/inference-common';
import type { InferenceServerClient } from '@kbn/inference-plugin/server';
import { GenerateConnectorTypeError } from './types';
import { MAX_DOCUMENT_CHARS, generateConnectorTypeSpec } from './generate_connector_type_spec';

const logger = loggingSystemMock.create().get();

const validSpec = {
  id: 'dynamic_type',
  displayName: 'Dynamic type',
  description: 'A connector type created at runtime.',
  config: [{ name: 'baseUrl', type: 'string', required: true }],
  auth: { type: 'bearer' },
  actions: {
    getItem: {
      description: 'Get one item.',
      scope: 'read',
      input: [],
      request: { method: 'GET', url: '{{config.baseUrl}}/items' },
    },
  },
};

const document = {
  url: 'https://docs.example.com/api',
  contentType: 'text/html',
  text: 'GET /items returns one item. Base URL is configurable.',
};

const clientWith = (chatComplete: jest.Mock) =>
  ({ chatComplete } as unknown as InferenceServerClient);

const generate = (chatComplete: jest.Mock, text = document.text) =>
  generateConnectorTypeSpec({
    inferenceClient: clientWith(chatComplete),
    featureId: 'connector_builder',
    document: { ...document, text },
    logger,
  });

describe('generateConnectorTypeSpec', () => {
  it('returns a spec parsed from valid JSON', async () => {
    const chatComplete = jest.fn().mockResolvedValue({ content: JSON.stringify(validSpec) });

    await expect(generate(chatComplete)).resolves.toEqual(validSpec);
    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'connector_builder', stream: false })
    );
  });

  it('accepts JSON wrapped in a code fence', async () => {
    const chatComplete = jest
      .fn()
      .mockResolvedValue({ content: '```json\n' + JSON.stringify(validSpec) + '\n```' });

    await expect(generate(chatComplete)).resolves.toEqual(validSpec);
    expect(chatComplete).toHaveBeenCalledTimes(1);
  });

  it('retries once and includes the zod issues in the retry message', async () => {
    const chatComplete = jest
      .fn()
      .mockResolvedValueOnce({ content: JSON.stringify({ id: 'Bad ID' }) })
      .mockResolvedValueOnce({ content: JSON.stringify(validSpec) });

    await expect(generate(chatComplete)).resolves.toEqual(validSpec);
    expect(chatComplete).toHaveBeenCalledTimes(2);
    const retryMessage = chatComplete.mock.calls[1][0].messages[0].content as string;
    expect(retryMessage).toContain('failed validation');
    expect(retryMessage).toContain('id');
  });

  it('throws invalid_output when the retry is still invalid', async () => {
    const chatComplete = jest.fn().mockResolvedValue({ content: JSON.stringify({ id: 'Bad ID' }) });

    await expect(generate(chatComplete)).rejects.toEqual(expect.any(GenerateConnectorTypeError));
    await expect(generate(chatComplete)).rejects.toMatchObject({
      reason: 'invalid_output',
      statusCode: 422,
    });
    expect(chatComplete).toHaveBeenCalledTimes(4);
  });

  it('retries non-JSON output and then throws invalid_output', async () => {
    const chatComplete = jest.fn().mockResolvedValue({ content: 'I cannot help with that.' });

    await expect(generate(chatComplete)).rejects.toMatchObject({
      reason: 'invalid_output',
      statusCode: 422,
    });
    expect(chatComplete).toHaveBeenCalledTimes(2);
  });

  it('maps a missing endpoint to no_model', async () => {
    const chatComplete = jest
      .fn()
      .mockRejectedValue(
        createInferenceRequestError(
          'No endpoint is available for feature "connector_builder". Check the default AI connector settings.',
          400
        )
      );

    await expect(generate(chatComplete)).rejects.toMatchObject({
      reason: 'no_model',
      statusCode: 400,
    });
  });

  it('maps a provider error to model_error', async () => {
    const chatComplete = jest
      .fn()
      .mockRejectedValue(createInferenceProviderError('upstream failed', { status: 503 }));

    await expect(generate(chatComplete)).rejects.toMatchObject({
      reason: 'model_error',
      statusCode: 502,
    });
  });

  it('truncates document text to MAX_DOCUMENT_CHARS', async () => {
    const overflow = 'TAIL_SHOULD_BE_CUT';
    const chatComplete = jest.fn().mockResolvedValue({ content: JSON.stringify(validSpec) });

    await generate(chatComplete, 'x'.repeat(MAX_DOCUMENT_CHARS) + overflow);

    const message = chatComplete.mock.calls[0][0].messages[0].content as string;
    expect(message).toContain('x'.repeat(MAX_DOCUMENT_CHARS));
    expect(message).not.toContain(overflow);
  });
});
