/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { PIPELINE_SIMULATE_MAX_DOCS } from '../../../common/constants/trained_models';
import { wrapPipelineSimulateError } from '../trained_models';
import { pipelineSimulateBody } from './inference_schema';

describe('pipelineSimulateBody', () => {
  test('accepts up to the maximum allowed number of docs', () => {
    const docs = Array.from({ length: PIPELINE_SIMULATE_MAX_DOCS }, () => ({
      _source: { message: 'hello' },
    }));
    expect(() =>
      pipelineSimulateBody.validate({
        pipeline: { processors: [] },
        docs,
      })
    ).not.toThrow();
  });

  test('rejects more than the maximum allowed number of docs', () => {
    const docs = Array.from({ length: PIPELINE_SIMULATE_MAX_DOCS + 1 }, () => ({
      _source: { message: 'hello' },
    }));
    expect(() =>
      pipelineSimulateBody.validate({
        pipeline: { processors: [] },
        docs,
      })
    ).toThrow('[docs]: array size is [101], but cannot be greater than [100]');
  });
});

describe('wrapPipelineSimulateError', () => {
  test('maps an oversized-response RequestAbortedError to 413', () => {
    const error = new errors.RequestAbortedError(
      'The content length (20000000) is bigger than the maximum allowed string (10485760)'
    );

    expect(wrapPipelineSimulateError(error)).toEqual({
      statusCode: 413,
      body: {
        message:
          'Pipeline simulation response exceeded the maximum allowed size. Reduce the size or number of sample documents.',
      },
    });
  });

  test('passes non-size RequestAbortedError instances to wrapError', () => {
    const error = new errors.RequestAbortedError('Request aborted by caller');

    const wrapped = wrapPipelineSimulateError(error);
    expect(wrapped.statusCode).toBe(500);
  });

  test('preserves upstream status codes on Elasticsearch ResponseError', () => {
    const error = new errors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 400,
        body: { message: 'bad pipeline' },
      })
    );

    const wrapped = wrapPipelineSimulateError(error);
    expect(wrapped.statusCode).toBe(400);
  });
});
