/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertStreamError,
  OpenAIErrorLine,
  ElasticInferenceErrorLine,
  UnknownErrorLine,
} from './stream_errors';

describe('convertStreamError', () => {
  it('handles the openAI format', () => {
    const line: OpenAIErrorLine = {
      error: {
        message: 'something bad happened',
      },
    };
    const error = convertStreamError(line);

    expect(error.toJSON()).toEqual({
      type: 'error',
      error: {
        code: 'internalError',
        message: 'something bad happened',
        meta: {},
      },
    });
  });

  it('handles the Elastic inference format', () => {
    const line: ElasticInferenceErrorLine = {
      error: {
        type: 'some_error_type',
        reason: 'something bad happened',
      },
    };
    const error = convertStreamError(line);

    expect(error.toJSON()).toEqual({
      type: 'error',
      error: {
        code: 'internalError',
        message: 'some_error_type - something bad happened',
        meta: {},
      },
    });
  });

  it('handles unknown formats', () => {
    const line: UnknownErrorLine = {
      error: {
        anotherErrorField: 'something bad happened',
      },
    };
    const error = convertStreamError(line);

    expect(error.toJSON()).toEqual({
      type: 'error',
      error: {
        code: 'internalError',
        message: '{"anotherErrorField":"something bad happened"}',
        meta: {},
      },
    });
  });
});
