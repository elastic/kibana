/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { StreamTooLargeError, streamToBuffer } from './stream_to_buffer';

describe('streamToBuffer', () => {
  it('joins all chunks into one buffer', async () => {
    const stream = Readable.from([Buffer.from('hello '), Buffer.from('world')]);
    const result = await streamToBuffer(stream);
    expect(result.toString()).toBe('hello world');
  });

  it('returns an empty buffer for an empty stream', async () => {
    const result = await streamToBuffer(Readable.from([]));
    expect(result.length).toBe(0);
  });

  it('accepts a stream that is exactly at the limit', async () => {
    const result = await streamToBuffer(Readable.from([Buffer.alloc(10)]), { maxBytes: 10 });
    expect(result.length).toBe(10);
  });

  it('rejects when the stream is over the limit', async () => {
    const stream = Readable.from([Buffer.alloc(6), Buffer.alloc(6)]);
    await expect(streamToBuffer(stream, { maxBytes: 10 })).rejects.toBeInstanceOf(
      StreamTooLargeError
    );
  });

  it('stops reading the stream after the limit is hit', async () => {
    const stream = Readable.from([Buffer.alloc(6), Buffer.alloc(6)]);
    await expect(streamToBuffer(stream, { maxBytes: 10 })).rejects.toThrow();
    expect(stream.destroyed).toBe(true);
  });

  it('rejects when the stream errors', async () => {
    const stream = new Readable({
      read() {
        this.destroy(new Error('boom'));
      },
    });
    await expect(streamToBuffer(stream)).rejects.toThrow('boom');
  });
});
