/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processBufferResponse } from './process_buffer_response';

describe('processBufferResponse', () => {
  describe('text content types', () => {
    it('should parse JSON for application/json bodies', () => {
      const data = Buffer.from(JSON.stringify({ id: 1 }), 'utf-8');
      expect(processBufferResponse(data, { 'content-type': 'application/json' })).toEqual({
        id: 1,
      });
    });

    it('should return plain string for application/json when body is not valid JSON', () => {
      const data = Buffer.from('not-json', 'utf-8');
      expect(processBufferResponse(data, { 'content-type': 'application/json' })).toBe('not-json');
    });

    it('should return plain string for text/plain', () => {
      const data = Buffer.from('hello', 'utf-8');
      expect(processBufferResponse(data, { 'content-type': 'text/plain' })).toBe('hello');
    });

    it('should parse JSON for application/vnd.api+json (suffix detection)', () => {
      const data = Buffer.from(JSON.stringify({ data: [] }), 'utf-8');
      expect(processBufferResponse(data, { 'content-type': 'application/vnd.api+json' })).toEqual({
        data: [],
      });
    });

    it('should strip charset and still parse JSON for application/json; charset=utf-8', () => {
      const data = Buffer.from('{"a":1}', 'utf-8');
      expect(
        processBufferResponse(data, { 'content-type': 'application/json; charset=utf-8' })
      ).toEqual({ a: 1 });
    });
  });

  describe('binary content types', () => {
    it('should return base64 for image/png and round-trip to original bytes', () => {
      const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const encoded = processBufferResponse(bytes, { 'content-type': 'image/png' });
      expect(typeof encoded).toBe('string');
      expect(Buffer.from(encoded as string, 'base64')).toEqual(bytes);
    });

    it('should return base64 for application/pdf', () => {
      const bytes = Buffer.from('%PDF-1.4', 'utf-8');
      expect(processBufferResponse(bytes, { 'content-type': 'application/pdf' })).toBe(
        bytes.toString('base64')
      );
    });

    it('should return base64 for application/octet-stream', () => {
      const bytes = Buffer.from([0, 1, 2, 255]);
      expect(processBufferResponse(bytes, { 'content-type': 'application/octet-stream' })).toBe(
        'AAEC/w=='
      );
    });

    it('should return base64 for unknown structured binary-like types', () => {
      const bytes = Buffer.from([1, 2, 3]);
      expect(processBufferResponse(bytes, { 'content-type': 'application/x-custom-format' })).toBe(
        'AQID'
      );
    });

    it('should still base64 for image/png with charset parameter', () => {
      const bytes = Buffer.from([0xff, 0xd8]);
      const encoded = processBufferResponse(bytes, { 'content-type': 'image/png; charset=binary' });
      expect(Buffer.from(encoded as string, 'base64')).toEqual(bytes);
    });
  });

  describe('content-type extraction', () => {
    it('should return base64 when content-type header is missing', () => {
      const bytes = Buffer.from([0xde, 0xad]);
      expect(processBufferResponse(bytes, {})).toBe('3q0=');
    });

    it('should return base64 when content-type header is an empty string', () => {
      const bytes = Buffer.from([0xde, 0xad]);
      expect(processBufferResponse(bytes, { 'content-type': '' })).toBe('3q0=');
    });

    it('should look up content-type case-insensitively', () => {
      const data = Buffer.from('{}', 'utf-8');
      expect(processBufferResponse(data, { 'Content-Type': 'application/json' })).toEqual({});
      expect(processBufferResponse(data, { 'CONTENT-TYPE': 'application/json' })).toEqual({});
    });

    it('should ignore unrelated headers', () => {
      const data = Buffer.from('hello', 'utf-8');
      expect(
        processBufferResponse(data, {
          'x-request-id': 'abc',
          'content-type': 'text/plain',
        })
      ).toBe('hello');
    });

    it('should treat content-type value case-insensitively', () => {
      expect(
        processBufferResponse(Buffer.from('{}', 'utf-8'), { 'content-type': 'APPLICATION/JSON' })
      ).toEqual({});
      const pngBytes = Buffer.from([0x89]);
      expect(
        Buffer.from(
          processBufferResponse(pngBytes, { 'content-type': 'IMAGE/PNG' }) as string,
          'base64'
        )
      ).toEqual(pngBytes);
    });
  });

  describe('data normalization', () => {
    it('should accept a Buffer directly', () => {
      const data = Buffer.from('hello', 'utf-8');
      expect(processBufferResponse(data, { 'content-type': 'text/plain' })).toBe('hello');
    });

    it('should accept an ArrayBuffer and decode it as UTF-8 JSON', () => {
      const source = Buffer.from(JSON.stringify({ id: 1 }), 'utf-8');
      const arrayBuffer = source.buffer.slice(
        source.byteOffset,
        source.byteOffset + source.byteLength
      );
      expect(processBufferResponse(arrayBuffer, { 'content-type': 'application/json' })).toEqual({
        id: 1,
      });
    });

    it('should accept a typed array (Uint8Array) and base64-encode binary content', () => {
      const uint8 = new Uint8Array([0, 1, 2, 255]);
      expect(processBufferResponse(uint8, { 'content-type': 'application/octet-stream' })).toBe(
        'AAEC/w=='
      );
    });

    it('should treat null/undefined data as an empty buffer (base64 empty string)', () => {
      expect(processBufferResponse(null, { 'content-type': 'application/octet-stream' })).toBe('');
      expect(processBufferResponse(undefined, { 'content-type': 'application/octet-stream' })).toBe(
        ''
      );
    });

    it('should treat null/undefined data as an empty string for text content-types', () => {
      expect(processBufferResponse(null, { 'content-type': 'text/plain' })).toBe('');
    });
  });
});
