/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIndexExists } from './get_index_exists';

class StatusCode extends Error {
  statusCode: number = -1;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

describe('get_index_exists', () => {
  test('it should return a true if no errors', async () => {
    const callWithRequest = jest.fn().mockResolvedValue('');
    const indexExists = await getIndexExists(callWithRequest, 'some-index');
    expect(indexExists).toEqual(true);
  });

  test('it should return a false if it encounters a 404', async () => {
    const callWithRequest = jest.fn().mockImplementation(() => {
      throw new StatusCode(404, 'I am a 404 error');
    });
    const indexExists = await getIndexExists(callWithRequest, 'some-index');
    expect(indexExists).toEqual(false);
  });

  test('it should reject if it encounters a non 404', async () => {
    const callWithRequest = jest.fn().mockImplementation(() => {
      throw new StatusCode(500, 'I am a 500 error');
    });
    await expect(getIndexExists(callWithRequest, 'some-index')).rejects.toThrow('I am a 500 error');
  });
});
