/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import fetchMock from 'fetch-mock';
import { throwIfNotOk, parseJsonFromBody, MessageBody } from './throw_if_not_ok';

describe('throw_if_not_ok', () => {
  afterEach(() => {
    fetchMock.reset();
  });

  test('does a throw if it is given response that is not ok and the body is not parseable', async () => {
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

  test('parses a json from the body correctly', async () => {
    fetchMock.mock('http://example.com', {
      status: 500,
      body: {
        error: 'some error',
        statusCode: 500,
        message: 'I am a custom message',
      },
    });
    const response = await fetch('http://example.com');
    const expected: MessageBody = {
      error: 'some error',
      statusCode: 500,
      message: 'I am a custom message',
    };
    await expect(parseJsonFromBody(response)).resolves.toEqual(expected);
  });

  test('returns null if the body does not exist', async () => {
    fetchMock.mock('http://example.com', { status: 500, body: 'some text' });
    const response = await fetch('http://example.com');
    await expect(parseJsonFromBody(response)).resolves.toEqual(null);
  });
});
