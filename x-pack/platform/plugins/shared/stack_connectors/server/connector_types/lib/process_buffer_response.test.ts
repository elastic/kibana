/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processBufferResponse } from './process_buffer_response';

describe('processBufferResponse', () => {
  it('should parse JSON for application/json bodies', () => {
    const buffer = Buffer.from(JSON.stringify({ id: 1 }), 'utf-8');
    expect(processBufferResponse(buffer, 'application/json')).toEqual({ id: 1 });
  });

  it('should return plain string for application/json when body is not valid JSON', () => {
    const buffer = Buffer.from('not-json', 'utf-8');
    expect(processBufferResponse(buffer, 'application/json')).toBe('not-json');
  });

  it('should return plain string for text/plain', () => {
    const buffer = Buffer.from('hello', 'utf-8');
    expect(processBufferResponse(buffer, 'text/plain')).toBe('hello');
  });

  it('should parse JSON for application/vnd.api+json (suffix detection)', () => {
    const buffer = Buffer.from(JSON.stringify({ data: [] }), 'utf-8');
    expect(processBufferResponse(buffer, 'application/vnd.api+json')).toEqual({ data: [] });
  });

  it('should return base64 for image/png and round-trip to original bytes', () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const encoded = processBufferResponse(bytes, 'image/png');
    expect(typeof encoded).toBe('string');
    expect(Buffer.from(encoded as string, 'base64')).toEqual(bytes);
  });

  it('should return base64 for application/pdf', () => {
    const bytes = Buffer.from('%PDF-1.4', 'utf-8');
    expect(processBufferResponse(bytes, 'application/pdf')).toBe(bytes.toString('base64'));
  });

  it('should return base64 for application/octet-stream', () => {
    const bytes = Buffer.from([0, 1, 2, 255]);
    expect(processBufferResponse(bytes, 'application/octet-stream')).toBe('AAEC/w==');
  });

  it('should return base64 for unknown structured binary-like types', () => {
    const bytes = Buffer.from([1, 2, 3]);
    expect(processBufferResponse(bytes, 'application/x-custom-format')).toBe('AQID');
  });

  it('should return base64 when content-type is missing, empty, or undefined', () => {
    const bytes = Buffer.from([0xde, 0xad]);
    expect(processBufferResponse(bytes, null)).toBe('3q0=');
    expect(processBufferResponse(bytes, undefined)).toBe('3q0=');
    expect(processBufferResponse(bytes, '')).toBe('3q0=');
  });

  it('should strip charset and still parse JSON for application/json; charset=utf-8', () => {
    const buffer = Buffer.from('{"a":1}', 'utf-8');
    expect(processBufferResponse(buffer, 'application/json; charset=utf-8')).toEqual({ a: 1 });
  });

  it('should still base64 for image/png with charset parameter', () => {
    const bytes = Buffer.from([0xff, 0xd8]);
    const encoded = processBufferResponse(bytes, 'image/png; charset=binary');
    expect(Buffer.from(encoded as string, 'base64')).toEqual(bytes);
  });

  it('should treat content-type case-insensitively', () => {
    expect(processBufferResponse(Buffer.from('{}', 'utf-8'), 'APPLICATION/JSON')).toEqual({});
    const pngBytes = Buffer.from([0x89]);
    expect(Buffer.from(processBufferResponse(pngBytes, 'IMAGE/PNG') as string, 'base64')).toEqual(
      pngBytes
    );
  });
});
