/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { AiIndexNotFoundError, AiIndexWriteForbiddenError } from '../ai_indices/errors';
import {
  ContextEngineDisabledError,
  MEMORY_DISABLED_MESSAGE,
  MemoryDisabledError,
  MemoryForbiddenError,
  RememberCapacityError,
  SessionMemoryNotFoundError,
} from '../session_memory_client/errors';
import { toMemoryWriteErrorResponse } from './memory_write';

describe('toMemoryWriteErrorResponse', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    response = httpServerMock.createResponseFactory();
  });

  it('answers 404 as if the route did not exist while Context Engine is turned off', () => {
    toMemoryWriteErrorResponse(new ContextEngineDisabledError(), response);

    expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Not Found' } });
  });

  it.each([
    ['memory is turned off', new MemoryDisabledError(), MEMORY_DISABLED_MESSAGE],
    ['an AI index is missing', new AiIndexNotFoundError('ops'), "AI index 'ops' not found"],
    [
      'the memory to revise is missing',
      new SessionMemoryNotFoundError('m1'),
      "Session memory 'm1' not found",
    ],
  ])('answers 404 when %s', (_name, error, message) => {
    toMemoryWriteErrorResponse(error, response);

    expect(response.notFound).toHaveBeenCalledWith({ body: { message } });
  });

  it.each([
    ['the caller may not act for the user', new MemoryForbiddenError('no profile')],
    ['an AI index is not writable', new AiIndexWriteForbiddenError('ops')],
  ])('answers 403 when %s', (_name, error) => {
    toMemoryWriteErrorResponse(error, response);

    expect(response.forbidden).toHaveBeenCalledWith({ body: { message: error.message } });
  });

  it('answers 429 with Retry-After when too many writes are in flight', () => {
    toMemoryWriteErrorResponse(new RememberCapacityError(), response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 429,
      body: { message: expect.stringContaining('Too many session memory writes') },
      headers: { 'Retry-After': '1' },
    });
  });

  it('rethrows any other error', () => {
    const error = new Error('cluster unavailable');

    expect(() => toMemoryWriteErrorResponse(error, response)).toThrow(error);
  });
});
