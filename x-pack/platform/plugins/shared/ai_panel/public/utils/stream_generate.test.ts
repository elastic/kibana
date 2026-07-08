/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { streamNdjson } from './stream_generate';

function makeReader(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    read: jest.fn(async () => {
      if (i >= chunks.length) return { done: true, value: undefined };
      return { done: false, value: encoder.encode(chunks[i++]) };
    }),
    releaseLock: jest.fn(),
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

function makeHttp(reader: ReadableStreamDefaultReader<Uint8Array>): HttpStart {
  return {
    post: jest.fn().mockResolvedValue({
      response: { body: { getReader: () => reader } },
    }),
  } as unknown as HttpStart;
}

describe('streamNdjson', () => {
  it('collects tokens from newline-delimited events', async () => {
    const reader = makeReader(['{"token":"hello"}\n{"token":" world"}\n']);
    const onToken = jest.fn();
    await streamNdjson(makeHttp(reader), '/test', {}, onToken, new AbortController().signal);
    expect(onToken).toHaveBeenCalledWith('hello');
    expect(onToken).toHaveBeenCalledWith(' world');
    expect(onToken).toHaveBeenCalledTimes(2);
  });

  it('handles tokens split across chunk boundaries', async () => {
    const reader = makeReader(['{"token":"hel', 'lo"}\n{"token":"world"}\n']);
    const onToken = jest.fn();
    await streamNdjson(makeHttp(reader), '/test', {}, onToken, new AbortController().signal);
    expect(onToken).toHaveBeenCalledWith('hello');
    expect(onToken).toHaveBeenCalledWith('world');
  });

  it('flushes a final line with no trailing newline', async () => {
    const reader = makeReader(['{"token":"first"}\n{"token":"last"}']);
    const onToken = jest.fn();
    await streamNdjson(makeHttp(reader), '/test', {}, onToken, new AbortController().signal);
    expect(onToken).toHaveBeenCalledWith('first');
    expect(onToken).toHaveBeenCalledWith('last');
  });

  it('throws when an error event is received', async () => {
    const reader = makeReader(['{"error":"something went wrong"}\n']);
    const onToken = jest.fn();
    await expect(
      streamNdjson(makeHttp(reader), '/test', {}, onToken, new AbortController().signal)
    ).rejects.toThrow('something went wrong');
    expect(onToken).not.toHaveBeenCalled();
  });

  it('silently skips malformed JSON lines', async () => {
    const reader = makeReader(['not-json\n{"token":"ok"}\n']);
    const onToken = jest.fn();
    await streamNdjson(makeHttp(reader), '/test', {}, onToken, new AbortController().signal);
    expect(onToken).toHaveBeenCalledTimes(1);
    expect(onToken).toHaveBeenCalledWith('ok');
  });

  it('silently skips empty lines', async () => {
    const reader = makeReader(['\n\n{"token":"ok"}\n\n']);
    const onToken = jest.fn();
    await streamNdjson(makeHttp(reader), '/test', {}, onToken, new AbortController().signal);
    expect(onToken).toHaveBeenCalledTimes(1);
  });

  it('throws when there is no response body', async () => {
    const http = {
      post: jest.fn().mockResolvedValue({ response: { body: null } }),
    } as unknown as HttpStart;
    await expect(
      streamNdjson(http, '/test', {}, jest.fn(), new AbortController().signal)
    ).rejects.toThrow('No response body');
  });

  it('always releases the reader lock, even on error', async () => {
    const reader = makeReader(['{"error":"boom"}\n']);
    await expect(
      streamNdjson(makeHttp(reader), '/test', {}, jest.fn(), new AbortController().signal)
    ).rejects.toThrow('boom');
    expect(reader.releaseLock).toHaveBeenCalledTimes(1);
  });
});
