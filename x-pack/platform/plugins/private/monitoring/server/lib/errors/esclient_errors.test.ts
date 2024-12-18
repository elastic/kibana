/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { isESClientError, handleESClientError } from './esclient_errors';

describe('Error handling for ESClient errors', () => {
  it('ignores an unknown type', () => {
    const err = new Error();
    expect(isESClientError(err)).toBe(false);
  });

  it('handles ConnectionError', () => {
    const err = new errors.ConnectionError('test 123', {} as any);
    expect(isESClientError(err)).toBe(true);

    const wrappedErr = handleESClientError(err);
    expect(wrappedErr.message).toBe(
      'Connection error: ' +
        'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
    );
    expect(wrappedErr.isBoom).toBe(true);
    expect(wrappedErr.isServer).toBe(true);
    expect(wrappedErr.data).toBe(null);
    expect(wrappedErr.output).toEqual({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          'Connection error: ' +
          'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.',
      },
      headers: {},
    });
  });

  it('handles NoLivingConnectionsError', () => {
    const err = new errors.NoLivingConnectionsError('test 123', {} as any);
    expect(isESClientError(err)).toBe(true);

    const wrappedErr = handleESClientError(err);
    expect(wrappedErr.message).toBe(
      'No living connections: ' +
        'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.'
    );
    expect(wrappedErr.isBoom).toBe(true);
    expect(wrappedErr.isServer).toBe(true);
    expect(wrappedErr.data).toBe(null);
    expect(wrappedErr.output).toEqual({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          'No living connections: ' +
          'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.',
      },
      headers: {},
    });
  });

  it('handles TimeoutError', () => {
    const err = new errors.TimeoutError('test 123', {} as any);
    expect(isESClientError(err)).toBe(true);

    const wrappedErr = handleESClientError(err);
    expect(wrappedErr.message).toBe(
      'Request timeout: ' +
        'Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.'
    );
    expect(wrappedErr.isBoom).toBe(true);
    expect(wrappedErr.isServer).toBe(true);
    expect(wrappedErr.data).toBe(null);
    expect(wrappedErr.output).toEqual({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          'Request timeout: Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.',
      },
      headers: {},
    });
  });
});
