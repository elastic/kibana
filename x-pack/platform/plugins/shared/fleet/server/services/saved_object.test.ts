/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeSearchQueryPhrase, normalizeKuery } from './saved_object';

describe('Saved object service', () => {
  describe('escapeSearchQueryPhrase', () => {
    it('should return value between quotes', () => {
      const res = escapeSearchQueryPhrase('-test');

      expect(res).toEqual('"-test"');
    });

    it('should escape quotes', () => {
      const res = escapeSearchQueryPhrase('test1"test2');

      expect(res).toEqual(`"test1\\"test2"`);
    });
  });

  describe('normalizeKuery', () => {
    it('without attributes postfix', () => {
      const res = normalizeKuery('foo', 'foo.');

      expect(res).toEqual('foo.attributes.');
    });

    it('with attributes postfix', () => {
      const res = normalizeKuery('foo', 'foo.attributes.');

      expect(res).toEqual('foo.attributes.');
    });

    it('only trigger on literal dots', () => {
      const res = normalizeKuery('foo', 'foobar');

      expect(res).toEqual('foobar');
    });
  });
});
