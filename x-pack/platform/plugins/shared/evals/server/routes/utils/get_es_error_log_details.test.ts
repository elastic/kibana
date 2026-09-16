/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { getEsErrorLogDetails } from './get_es_error_log_details';

type ResponseErrorArgs = ConstructorParameters<typeof EsErrors.ResponseError>[0];

const buildResponseError = (body: unknown, statusCode = 500) =>
  new EsErrors.ResponseError({
    statusCode,
    body,
    headers: {},
    warnings: [],
    meta: {} as ResponseErrorArgs['meta'],
  });

describe('getEsErrorLogDetails', () => {
  it('prefers the deepest root_cause over the top-level Elasticsearch error', () => {
    const { message, meta } = getEsErrorLogDetails(
      buildResponseError(
        {
          error: {
            type: 'search_phase_execution_exception',
            reason: 'all shards failed',
            root_cause: [
              {
                type: 'too_many_buckets_exception',
                reason: 'Trying to create too many buckets.',
              },
            ],
          },
        },
        503
      )
    );

    expect(message).toBe(
      'too_many_buckets_exception: Trying to create too many buckets. (status 503)'
    );
    expect(meta.error).toEqual(
      expect.objectContaining({
        type: 'too_many_buckets_exception',
        message: 'Trying to create too many buckets.',
      })
    );
  });

  it('falls back to the top-level error when there is no root_cause', () => {
    const { message, meta } = getEsErrorLogDetails(
      buildResponseError(
        { error: { type: 'index_not_found_exception', reason: 'no such index' } },
        404
      )
    );

    expect(message).toBe('index_not_found_exception: no such index (status 404)');
    expect(meta.error).toEqual(
      expect.objectContaining({ type: 'index_not_found_exception', message: 'no such index' })
    );
  });

  it('falls back to the error name and message when the body carries no error', () => {
    const { message, meta } = getEsErrorLogDetails(buildResponseError({}, 500));

    expect(message).toContain('ResponseError');
    expect(meta.error).toEqual(expect.objectContaining({ type: 'ResponseError' }));
  });

  it('reports plain Errors with their name, message and stack', () => {
    const { message, meta } = getEsErrorLogDetails(new TypeError('not a function'));

    expect(message).toBe('not a function');
    expect(meta.error).toEqual(
      expect.objectContaining({ type: 'TypeError', message: 'not a function' })
    );
    expect(meta.error?.stack_trace).toBeDefined();
  });

  it('stringifies values that are not Errors', () => {
    const { message, meta } = getEsErrorLogDetails('boom');

    expect(message).toBe('boom');
    expect(meta.error).toEqual({ message: 'boom' });
  });
});
