/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as zlib from 'zlib';

import type { Logger } from '@kbn/logging';

import { streamFactory } from './stream_factory';

interface MockItem {
  type: string;
  payload: string[];
}

const mockItem1: MockItem = {
  type: 'add_fields',
  payload: ['clientip'],
};
const mockItem2: MockItem = {
  type: 'add_fields',
  payload: ['referer'],
};

describe('streamFactory', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;
  });

  it('should encode and receive an uncompressed string based stream', async () => {
    const { end, push, responseWithHeaders } = streamFactory({}, mockLogger);

    push('push1');
    push('push2');
    end();

    let streamResult = '';
    for await (const chunk of responseWithHeaders.body) {
      streamResult += chunk.toString('utf8');
    }

    expect(responseWithHeaders.headers).toStrictEqual({
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(streamResult).toBe('push1push2');
  });

  it('should encode and receive an uncompressed NDJSON based stream', async () => {
    const { DELIMITER, end, push, responseWithHeaders } = streamFactory<MockItem>({}, mockLogger);

    push(mockItem1);
    push(mockItem2);
    end();

    let streamResult = '';
    for await (const chunk of responseWithHeaders.body) {
      streamResult += chunk.toString('utf8');
    }

    const streamItems = streamResult.split(DELIMITER);
    const lastItem = streamItems.pop();

    const parsedItems = streamItems.map((d) => JSON.parse(d));

    expect(responseWithHeaders.headers).toStrictEqual({
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(parsedItems).toHaveLength(2);
    expect(parsedItems[0]).toStrictEqual(mockItem1);
    expect(parsedItems[1]).toStrictEqual(mockItem2);
    expect(lastItem).toBe('');
  });

  // Because zlib.gunzip's API expects a callback, we need to use `done` here
  // to indicate once all assertions are run. However, it's not allowed to use both
  // `async` and `done` for the test callback. That's why we're using an "async IIFE"
  // pattern inside the tests callback to still be able to do async/await for the
  // `for await()` part. Note that the unzipping here is done just to be able to
  // decode the stream for the test and assert it. When used in actual code,
  // the browser on the client side will automatically take care of unzipping
  // without the need for additional custom code.
  it('should encode and receive a compressed string based stream', (done) => {
    void (async () => {
      const { end, push, responseWithHeaders } = streamFactory(
        {
          'accept-encoding': 'gzip',
        },
        mockLogger
      );

      push('push1');
      push('push2');
      end();

      const chunks = [];
      for await (const chunk of responseWithHeaders.body) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      zlib.gunzip(buffer, function (err, decoded) {
        expect(err).toBe(null);

        const streamResult = decoded.toString('utf8');

        expect(responseWithHeaders.headers).toStrictEqual({
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'content-encoding': 'gzip',
          'Transfer-Encoding': 'chunked',
          'X-Accel-Buffering': 'no',
          'X-Content-Type-Options': 'nosniff',
        });
        expect(streamResult).toBe('push1push2');

        done();
      });
    })();
  });

  it('should encode and receive a compressed NDJSON based stream', (done) => {
    void (async () => {
      const { DELIMITER, end, push, responseWithHeaders } = streamFactory<MockItem>(
        {
          'accept-encoding': 'gzip',
        },
        mockLogger
      );

      push(mockItem1);
      push(mockItem2);
      end();

      const chunks = [];
      for await (const chunk of responseWithHeaders.body) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      zlib.gunzip(buffer, function (err, decoded) {
        expect(err).toBe(null);

        const streamResult = decoded.toString('utf8');

        const streamItems = streamResult.split(DELIMITER);
        const lastItem = streamItems.pop();

        const parsedItems = streamItems.map((d) => JSON.parse(d));

        expect(responseWithHeaders.headers).toStrictEqual({
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'content-encoding': 'gzip',
          'Transfer-Encoding': 'chunked',
          'X-Accel-Buffering': 'no',
          'X-Content-Type-Options': 'nosniff',
        });
        expect(parsedItems).toHaveLength(2);
        expect(parsedItems[0]).toStrictEqual(mockItem1);
        expect(parsedItems[1]).toStrictEqual(mockItem2);
        expect(lastItem).toBe('');

        done();
      });
    })();
  });

  it('should log an error when a string based stream receives a non-string chunk', async () => {
    const { push } = streamFactory({}, mockLogger);

    // First push initializes the stream as string based.
    push('push1');
    expect(mockLogger.error).toHaveBeenCalledTimes(0);

    // Second push is again a string and should not throw.
    push('push2');
    expect(mockLogger.error).toHaveBeenCalledTimes(0);

    // Third push is not a string and should trigger an error.
    push({ myObject: 'push3' } as unknown as string);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Must not push non-string chunks to a string based stream.'
    );
  });

  it('should log an error when an NDJSON based stream receives a string chunk', async () => {
    const { push } = streamFactory<MockItem>({}, mockLogger);

    // First push initializes the stream as NDJSON based.
    push(mockItem1);
    expect(mockLogger.error).toHaveBeenCalledTimes(0);

    // Second push is again a valid object and should not throw.
    push(mockItem1);
    expect(mockLogger.error).toHaveBeenCalledTimes(0);

    // Third push is a string and should trigger an error.
    push('push3' as unknown as MockItem);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Must not push raw string chunks to an NDJSON based stream.'
    );
  });

  it('should log an error for undefined as push value', async () => {
    const { push } = streamFactory({}, mockLogger);

    push(undefined as unknown as string);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith('Stream chunk must not be undefined.');
  });
});
