/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchAsDataUrl, parseDataUrl, readBlobAsDataUrl } from './data_url';

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

describe('parseDataUrl', () => {
  it('parses a base64 data URL into its media type and payload', () => {
    expect(parseDataUrl(`data:image/png;base64,${PNG_BASE64}`)).toEqual({
      mediaType: 'image/png',
      data: PNG_BASE64,
    });
  });

  it('preserves a media type that contains a "+" sub-type', () => {
    expect(parseDataUrl('data:image/svg+xml;base64,PHN2Zy8+')).toEqual({
      mediaType: 'image/svg+xml',
      data: 'PHN2Zy8+',
    });
  });

  it('returns an empty data string when the payload is empty', () => {
    expect(parseDataUrl('data:image/png;base64,')).toEqual({
      mediaType: 'image/png',
      data: '',
    });
  });

  it('returns null for non-base64 data URLs', () => {
    expect(parseDataUrl('data:image/png,not-base64')).toBeNull();
  });

  it('returns null for strings that are not data URLs', () => {
    expect(parseDataUrl('https://example.com/logo.png')).toBeNull();
    expect(parseDataUrl('')).toBeNull();
  });
});

describe('readBlobAsDataUrl', () => {
  it('resolves with a base64 data URL for a text blob', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });

    const dataUrl = await readBlobAsDataUrl(blob);

    expect(dataUrl).toBe(`data:text/plain;base64,${Buffer.from('hello').toString('base64')}`);
  });

  it('rejects with the FileReader error when reading fails', async () => {
    const fileReaderError = new Error('boom');
    const spy = jest
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(function mockedReadAsDataURL(this: FileReader) {
        queueMicrotask(() => {
          Object.defineProperty(this, 'error', { value: fileReaderError, configurable: true });
          this.dispatchEvent(new ProgressEvent('error'));
        });
      });

    try {
      await expect(readBlobAsDataUrl(new Blob(['x']))).rejects.toBe(fileReaderError);
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects when the FileReader yields a non-string result', async () => {
    const spy = jest
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(function mockedReadAsDataURL(this: FileReader) {
        queueMicrotask(() => {
          Object.defineProperty(this, 'result', { value: new ArrayBuffer(0), configurable: true });
          this.dispatchEvent(new ProgressEvent('loadend'));
        });
      });

    try {
      await expect(readBlobAsDataUrl(new Blob(['x']))).rejects.toThrow(
        'FileReader did not return a string'
      );
    } finally {
      spy.mockRestore();
    }
  });
});

describe('fetchAsDataUrl', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the input unchanged when given a data URL', async () => {
    const fetchSpy: jest.MockedFunction<typeof fetch> = jest.fn();
    globalThis.fetch = fetchSpy;

    const dataUrl = `data:image/png;base64,${PNG_BASE64}`;
    await expect(fetchAsDataUrl(dataUrl)).resolves.toBe(dataUrl);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches the URL and returns a base64 data URL of the response body', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const fetchSpy: jest.MockedFunction<typeof fetch> = jest
      .fn()
      .mockResolvedValue(new Response(blob, { headers: { 'content-type': 'text/plain' } }));
    globalThis.fetch = fetchSpy;

    const dataUrl = await fetchAsDataUrl('https://example.com/file.txt');

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/file.txt', { signal: undefined });
    expect(dataUrl).toBe(`data:text/plain;base64,${Buffer.from('hello').toString('base64')}`);
  });

  it('forwards the abort signal to fetch', async () => {
    const blob = new Blob(['x'], { type: 'text/plain' });
    const fetchSpy: jest.MockedFunction<typeof fetch> = jest
      .fn()
      .mockResolvedValue(new Response(blob, { headers: { 'content-type': 'text/plain' } }));
    globalThis.fetch = fetchSpy;

    const controller = new AbortController();
    await fetchAsDataUrl('https://example.com/file.txt', controller.signal);

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/file.txt', {
      signal: controller.signal,
    });
  });

  it('propagates fetch errors', async () => {
    const fetchError = new Error('network down');
    const fetchSpy: jest.MockedFunction<typeof fetch> = jest.fn().mockRejectedValue(fetchError);
    globalThis.fetch = fetchSpy;

    await expect(fetchAsDataUrl('https://example.com/file.txt')).rejects.toBe(fetchError);
  });
});
