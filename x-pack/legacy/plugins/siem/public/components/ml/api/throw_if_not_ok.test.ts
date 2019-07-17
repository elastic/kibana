/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import fetchMock from 'fetch-mock';
import {
  throwIfNotOk,
  parseJsonFromBody,
  MessageBody,
  tryParseResponse,
  throwIfErrorAttached,
  isMlErrorMsg,
  ToasterErrors,
} from './throw_if_not_ok';

describe('throw_if_not_ok', () => {
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

  describe('#parseJsonFromBody', () => {
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

  describe('#tryParseResponse', () => {
    test('It formats a JSON object', () => {
      const parsed = tryParseResponse(JSON.stringify({ hello: 'how are you?' }));
      expect(parsed).toEqual('{\n  "hello": "how are you?"\n}');
    });

    test('It returns a string as is if that string is not JSON', () => {
      const parsed = tryParseResponse('some string');
      expect(parsed).toEqual('some string');
    });
  });

  describe('#isMlErrorMsg', () => {
    test('It returns true for a ml error msg json', () => {
      const json: Record<string, Record<string, unknown>> = {
        error: {
          msg: 'some message',
          response: 'some response',
          statusCode: 400,
        },
      };
      expect(isMlErrorMsg(json)).toEqual(true);
    });

    test('It returns false to a ml error msg if it is missing msg', () => {
      const json: Record<string, Record<string, unknown>> = {
        error: {
          response: 'some response',
          statusCode: 400,
        },
      };
      expect(isMlErrorMsg(json)).toEqual(false);
    });

    test('It returns false to a ml error msg if it is missing response', () => {
      const json: Record<string, Record<string, unknown>> = {
        error: {
          response: 'some response',
          statusCode: 400,
        },
      };
      expect(isMlErrorMsg(json)).toEqual(false);
    });

    test('It returns false to a ml error msg if it is missing statusCode', () => {
      const json: Record<string, Record<string, unknown>> = {
        error: {
          msg: 'some message',
          response: 'some response',
        },
      };
      expect(isMlErrorMsg(json)).toEqual(false);
    });

    test('It returns false to a ml error msg if it is missing error completely', () => {
      const json: Record<string, Record<string, unknown>> = {};
      expect(isMlErrorMsg(json)).toEqual(false);
    });
  });

  describe('#throwIfErrorAttached', () => {
    test('It throws if an error is attached', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id': {
          error: {
            msg: 'some message',
            response: 'some response',
            statusCode: 400,
          },
        },
      };
      expect(() => throwIfErrorAttached(json, ['some-id'])).toThrow(
        new ToasterErrors(['some message'])
      );
    });

    test('It throws if an error is attached and has all the messages expected', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id': {
          error: {
            msg: 'some message',
            response: 'some response',
            statusCode: 400,
          },
        },
      };
      try {
        throwIfErrorAttached(json, ['some-id']);
      } catch (error) {
        expect(error.messages).toEqual(['some message', 'some response', 'Status Code: 400']);
      }
    });

    test('It throws if an error with the response parsed correctly', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id': {
          error: {
            msg: 'some message',
            response: JSON.stringify({ hello: 'how are you?' }),
            statusCode: 400,
          },
        },
      };
      try {
        throwIfErrorAttached(json, ['some-id']);
      } catch (error) {
        expect(error.messages).toEqual([
          'some message',
          '{\n  "hello": "how are you?"\n}',
          'Status Code: 400',
        ]);
      }
    });

    test('It throws if an error is attached and has all the messages expected with multiple ids', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id-1': {
          error: {
            msg: 'some message 1',
            response: 'some response 1',
            statusCode: 400,
          },
        },
        'some-id-2': {
          error: {
            msg: 'some message 2',
            response: 'some response 2',
            statusCode: 500,
          },
        },
      };
      try {
        throwIfErrorAttached(json, ['some-id-1', 'some-id-2']);
      } catch (error) {
        expect(error.messages).toEqual([
          'some message 1',
          'some response 1',
          'Status Code: 400',
          'some message 2',
          'some response 2',
          'Status Code: 500',
        ]);
      }
    });

    test('It throws if an error is attached and has all the messages expected with multiple ids but only one valid one is given', async () => {
      const json: Record<string, Record<string, unknown>> = {
        'some-id-1': {
          error: {
            msg: 'some message 1',
            response: 'some response 1',
            statusCode: 400,
          },
        },
        'some-id-2': {
          error: {
            msg: 'some message 2',
            response: 'some response 2',
            statusCode: 500,
          },
        },
      };
      try {
        throwIfErrorAttached(json, ['some-id-1', 'some-id-not-here']);
      } catch (error) {
        expect(error.messages).toEqual(['some message 1', 'some response 1', 'Status Code: 400']);
      }
    });
  });
});
