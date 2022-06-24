/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as zlib from 'zlib';

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
  it('should encode and receive an uncompressed string based stream', async () => {
    const { end, push, responseWithHeaders } = streamFactory({});

    push('push1');
    push('push2');
    end();

    let streamResult = '';
    for await (const chunk of responseWithHeaders.body) {
      streamResult += chunk.toString('utf8');
    }

    expect(responseWithHeaders.headers).toBe(undefined);
    expect(streamResult).toBe('push1push2');
  });

  it('should encode and receive an uncompressed NDJSON based stream', async () => {
    const { DELIMITER, end, push, responseWithHeaders } = streamFactory<MockItem>({});

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

    expect(responseWithHeaders.headers).toBe(undefined);
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
    (async () => {
      const { end, push, responseWithHeaders } = streamFactory({
        'accept-encoding': 'gzip',
      });

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

        expect(responseWithHeaders.headers).toStrictEqual({ 'content-encoding': 'gzip' });
        expect(streamResult).toBe('push1push2');

        done();
      });
    })();
  });

  it('should encode and receive a compressed NDJSON based stream', (done) => {
    (async () => {
      const { DELIMITER, end, push, responseWithHeaders } = streamFactory<MockItem>({
        'accept-encoding': 'gzip',
      });

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

        expect(responseWithHeaders.headers).toStrictEqual({ 'content-encoding': 'gzip' });
        expect(parsedItems).toHaveLength(2);
        expect(parsedItems[0]).toStrictEqual(mockItem1);
        expect(parsedItems[1]).toStrictEqual(mockItem2);
        expect(lastItem).toBe('');

        done();
      });
    })();
  });

  it('should throw when a string based stream receives a non-string chunk', async () => {
    const { push } = streamFactory({});

    // First push initializes the stream as string based.
    expect(() => {
      push('push1');
    }).not.toThrow();

    // Second push is again a string and should not throw.
    expect(() => {
      push('push2');
    }).not.toThrow();

    // Third push is not a string and should trigger an error.
    expect(() => {
      push({ myObject: 'push3' } as unknown as string);
    }).toThrow('Must not push non-string chunks to a string based stream.');
  });

  it('should throw when an NDJSON based stream receives a string chunk', async () => {
    const { push } = streamFactory<MockItem>({});

    // First push initializes the stream as NDJSON based.
    expect(() => {
      push(mockItem1);
    }).not.toThrow();

    // Second push is again a valid object and should not throw.
    expect(() => {
      push(mockItem1);
    }).not.toThrow();

    // Third push is a string and should trigger an error.
    expect(() => {
      push('push3' as unknown as MockItem);
    }).toThrow('Must not push raw string chunks to an NDJSON based stream.');
  });

  it('should throw for undefined as push value', async () => {
    const { push } = streamFactory({});

    expect(() => {
      push(undefined as unknown as string);
    }).toThrow('Stream chunk must not be undefined.');
  });
});
