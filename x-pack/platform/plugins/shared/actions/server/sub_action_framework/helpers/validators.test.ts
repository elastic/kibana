/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertURL } from './validators';

describe('Validators', () => {
  describe('assertURL function', () => {
    it('valid URL with a valid protocol and hostname does not throw an error', () => {
      expect(() => assertURL('https://www.example.com')).not.toThrow();
    });

    it('invalid URL throws an error with a relevant message', () => {
      expect(() => assertURL('invalidurl')).toThrowError('Invalid URL');
    });

    it('URL with an invalid protocol throws an error with a relevant message', () => {
      expect(() => assertURL('ftp://www.example.com')).toThrowError('Invalid protocol');
    });

    it('function handles case sensitivity of protocols correctly', () => {
      expect(() => assertURL('hTtPs://www.example.com')).not.toThrow();
    });

    it('function handles URLs with query parameters and fragment identifiers correctly', () => {
      expect(() => assertURL('https://www.example.com/path?query=value#fragment')).not.toThrow();
    });
  });
});
