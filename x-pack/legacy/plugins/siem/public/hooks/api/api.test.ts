/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetchMock from 'fetch-mock';
import { throwIfNotOk } from './api';

describe('api', () => {
  afterEach(() => {
    fetchMock.reset();
  });

  describe('#throwIfNotOk', () => {
    test('does a throw if it is given response that is not ok and the body is not parsable', async () => {
      fetchMock.mock('http://example.com', 500);
      const response = await fetch('http://example.com');
      await expect(throwIfNotOk(response)).rejects.toThrow('Network Error: Internal Server Error');
    });

    test('does a throw and returns a body if it is parsable', async () => {
      fetchMock.mock('http://example.com', {
        status: 500,
        body: {
          statusCode: 500,
          message: 'I am a custom message',
        },
      });
      const response = await fetch('http://example.com');
      await expect(throwIfNotOk(response)).rejects.toThrow('I am a custom message');
    });

    test('does NOT do a throw if it is given response is not ok', async () => {
      fetchMock.mock('http://example.com', 200);
      const response = await fetch('http://example.com');
      await expect(throwIfNotOk(response)).resolves.toEqual(undefined);
    });
  });
});
