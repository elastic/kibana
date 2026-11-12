/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { withErrorBody } from './with_error_body';

/** A stand-in for core's `HttpFetchError` of a `rawResponse` request: the body is not read. */
const httpError = (response?: Response, message = 'Bad Request') =>
  Object.assign(new Error(message), { request: {}, response, body: null });

const jsonResponse = (body: unknown, status = 400) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('withErrorBody', () => {
  it('returns the result of a request that succeeds', async () => {
    await expect(withErrorBody(Promise.resolve('ok'))).resolves.toBe('ok');
  });

  it('reads the server message of a refused request into the error', async () => {
    const serverMessage =
      'Attachment validation failed: The text of the file is too long. Try a smaller file.';
    const error = httpError(jsonResponse({ statusCode: 400, message: serverMessage }));

    const thrown = await withErrorBody(Promise.reject(error)).catch((e) => e);

    expect(thrown).toBe(error);
    expect(thrown.response.status).toBe(400);
    expect(formatAgentBuilderErrorMessage(thrown)).toBe(serverMessage);
  });

  it('keeps the error as it is when the body is not JSON', async () => {
    const error = httpError(new Response('<html>Bad Gateway</html>', { status: 502 }));

    const thrown = await withErrorBody(Promise.reject(error)).catch((e) => e);

    expect(thrown).toBe(error);
    expect(thrown.body).toBeNull();
  });

  it('keeps a body that is already read', async () => {
    const error = Object.assign(httpError(jsonResponse({ message: 'from the response' })), {
      body: { message: 'already read' },
    });

    const thrown = await withErrorBody(Promise.reject(error)).catch((e) => e);

    expect(thrown.body).toEqual({ message: 'already read' });
  });

  it('keeps the error when the response body was used', async () => {
    const response = jsonResponse({ message: 'gone' });
    await response.text();
    const error = httpError(response);

    const thrown = await withErrorBody(Promise.reject(error)).catch((e) => e);

    expect(thrown).toBe(error);
    expect(thrown.body).toBeNull();
  });

  it('keeps an error without a response, so a cut connection can still reattach', async () => {
    const error = httpError(undefined, 'Failed to fetch');

    await expect(withErrorBody(Promise.reject(error))).rejects.toBe(error);
  });

  it('keeps an error that is not an HTTP error', async () => {
    const error = new Error('aborted');

    await expect(withErrorBody(Promise.reject(error))).rejects.toBe(error);
  });
});
