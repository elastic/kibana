/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateHost } from './use_download_source_flyout_form';

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
});
