/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateHost, validateDownloadSourceHeaders } from './use_download_source_flyout_form';

describe('Download source form validation', () => {
  describe('validateHost', () => {
    it('should not work without any urls', () => {
      const res = validateHost('');

      expect(res).toEqual(['Host is required']);
    });

    it('should work with valid url with https protocol', () => {
      const res = validateHost('https://test.co:9200');

      expect(res).toBeUndefined();
    });

    it('should work with valid url with http protocol', () => {
      const res = validateHost('http://test.co');

      expect(res).toBeUndefined();
    });

    it('should work with valid url with path', () => {
      const res = validateHost('http://test.co/download');

      expect(res).toBeUndefined();
    });

    it('should return an error with invalid url', () => {
      const res = validateHost('toto');

      expect(res).toEqual(['Invalid URL']);
    });

    it('should return an error with url with invalid port', () => {
      const res = validateHost('https://test.fr:qwerty9200');

      expect(res).toEqual(['Invalid URL']);
    });
  });

  describe('validateDownloadSourceHeaders', () => {
    it('should return undefined for valid headers', () => {
      const res = validateDownloadSourceHeaders([
        { key: 'X-Custom-Header', value: 'custom-value' },
        { key: 'Authorization', value: 'Bearer token' },
      ]);

      expect(res).toBeUndefined();
    });

    it('should return undefined for empty headers (both key and value empty)', () => {
      const res = validateDownloadSourceHeaders([{ key: '', value: '' }]);

      expect(res).toBeUndefined();
    });

    it('should return error when key is provided without value', () => {
      const res = validateDownloadSourceHeaders([{ key: 'X-Custom-Header', value: '' }]);

      expect(res).toEqual([
        {
          message: 'Missing value for key "X-Custom-Header"',
          index: 0,
          hasKeyError: false,
          hasValueError: true,
        },
      ]);
    });

    it('should return error when value is provided without key', () => {
      const res = validateDownloadSourceHeaders([{ key: '', value: 'some-value' }]);

      expect(res).toEqual([
        {
          message: 'Missing key for value "some-value"',
          index: 0,
          hasKeyError: true,
          hasValueError: false,
        },
      ]);
    });

    it('should return error for duplicate keys', () => {
      const res = validateDownloadSourceHeaders([
        { key: 'X-Custom-Header', value: 'value1' },
        { key: 'X-Custom-Header', value: 'value2' },
      ]);

      expect(res).toEqual([
        {
          message: 'Duplicate key "X-Custom-Header"',
          index: 1,
          hasKeyError: true,
          hasValueError: false,
        },
      ]);
    });

    it('should return multiple errors for multiple issues', () => {
      const res = validateDownloadSourceHeaders([
        { key: 'X-Valid', value: 'valid' },
        { key: 'X-Missing-Value', value: '' },
        { key: '', value: 'missing-key' },
        { key: 'X-Valid', value: 'duplicate' },
      ]);

      expect(res).toHaveLength(3);
      expect(res).toContainEqual({
        message: 'Missing value for key "X-Missing-Value"',
        index: 1,
        hasKeyError: false,
        hasValueError: true,
      });
      expect(res).toContainEqual({
        message: 'Missing key for value "missing-key"',
        index: 2,
        hasKeyError: true,
        hasValueError: false,
      });
      expect(res).toContainEqual({
        message: 'Duplicate key "X-Valid"',
        index: 3,
        hasKeyError: true,
        hasValueError: false,
      });
    });
  });
});
