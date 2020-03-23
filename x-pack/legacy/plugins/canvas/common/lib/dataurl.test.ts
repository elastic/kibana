/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidDataUrl, parseDataUrl } from './dataurl';

const BASE64_TEXT = 'data:text/plain;charset=utf-8;base64,VGhpcyBpcyBhIHRlc3Q=';
const BASE64_SVG =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
const BASE64_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk8PxfDwADYgHJvQ16TAAAAABJRU5ErkJggg==';
const INVALID_BASE64_PIXEL =
  'data:image/png;%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%01%00%00%00%01%08%06%00%00%00%1F%15%C4%89%0';

const RAW_TEXT = 'data:text/plain;charset=utf-8,This%20is%20a%20test';
const RAW_SVG =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E';
const RAW_PIXEL =
  'data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%01%00%00%00%01%08%06%00%00%00%1F%15%C4%89%00%00%00%0DIDATx%DAcd%F0%FC_%0F%00%03b%01%C9%BD%0DzL%00%00%00%00IEND%AEB%60%82';

describe('dataurl', () => {
  describe('isValidDataUrl', () => {
    it('returns false for an invalid data url', () => {
      expect(isValidDataUrl('somestring')).toBe(false);
    });
    it('returns false for an empty string', () => {
      expect(isValidDataUrl('')).toBe(false);
    });
    it('returns true for valid data urls', () => {
      expect(isValidDataUrl(BASE64_TEXT)).toBe(true);
      expect(isValidDataUrl(BASE64_SVG)).toBe(true);
      expect(isValidDataUrl(BASE64_PIXEL)).toBe(true);
      expect(isValidDataUrl(RAW_TEXT)).toBe(true);
      expect(isValidDataUrl(RAW_SVG)).toBe(true);
      expect(isValidDataUrl(RAW_PIXEL)).toBe(true);
    });
  });

  describe('dataurl.parseDataUrl', () => {
    it('returns null for an invalid data url', () => {
      expect(parseDataUrl('somestring')).toBeNull();
    });
    it('returns null for an invalid base64 image', () => {
      expect(parseDataUrl(INVALID_BASE64_PIXEL)).toBeNull();
    });
    it('returns correct values for text data urls', () => {
      expect(parseDataUrl(BASE64_TEXT)).toEqual({
        charset: 'utf-8',
        data: null,
        encoding: 'base64',
        extension: 'txt',
        isImage: false,
        mimetype: 'text/plain',
      });
      expect(parseDataUrl(RAW_TEXT)).toEqual({
        charset: 'utf-8',
        data: null,
        encoding: undefined,
        extension: 'txt',
        isImage: false,
        mimetype: 'text/plain',
      });
    });
    it('returns correct values for png data urls', () => {
      expect(parseDataUrl(RAW_PIXEL)).toBeNull();
      expect(parseDataUrl(BASE64_PIXEL)).toEqual({
        charset: undefined,
        data: null,
        encoding: 'base64',
        extension: 'png',
        isImage: true,
        mimetype: 'image/png',
      });
    });
    it('returns correct values for svg data urls', () => {
      expect(parseDataUrl(RAW_SVG)).toEqual({
        charset: undefined,
        data: null,
        encoding: undefined,
        extension: 'svg',
        isImage: true,
        mimetype: 'image/svg+xml',
      });
      expect(parseDataUrl(BASE64_SVG)).toEqual({
        charset: undefined,
        data: null,
        encoding: 'base64',
        extension: 'svg',
        isImage: true,
        mimetype: 'image/svg+xml',
      });
    });
  });
});
