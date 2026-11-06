/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { kibanaResponseFactory } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { handleMaximumResponseSizeExceededError } from './handle_response_size_error';

describe('handleMaximumResponseSizeExceededError', () => {
  const setup = () => {
    const logger = loggingSystemMock.createLogger();
    return { logger, response: kibanaResponseFactory };
  };

  it('returns an actionable 400 and logs at warn level for a maximum response size error', () => {
    const { logger, response } = setup();
    const message = 'The content length (9000) is bigger than the maximum allowed buffer (42)';
    const error = new errors.RequestAbortedError(message);

    const result = handleMaximumResponseSizeExceededError({
      error,
      response,
      logger,
      context: 'Get example scores',
    });

    expect(result).toBeDefined();
    expect(result!.status).toBe(400);
    expect(result!.payload).toEqual({
      message: `The response is too large to process. error: ${message}`,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns undefined for a request aborted error without a content length message', () => {
    const { logger, response } = setup();
    const error = new errors.RequestAbortedError('Oh no');

    const result = handleMaximumResponseSizeExceededError({
      error,
      response,
      logger,
      context: 'Get example scores',
    });

    expect(result).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns undefined for unrelated errors', () => {
    const { logger, response } = setup();

    const result = handleMaximumResponseSizeExceededError({
      error: new Error('ES error'),
      response,
      logger,
      context: 'Get example scores',
    });

    expect(result).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
