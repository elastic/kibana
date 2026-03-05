/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidIndexName, generateRandomIndexName } from './utils';

describe('create index utilities', () => {
  describe('isValidIndexName', () => {
    it('returns undefined for a valid name', () => {
      expect(isValidIndexName('my-index')).toBe(true);
    });
    it('returns error for empty name', () => {
      expect(isValidIndexName('')).toBe(false);
    });
    it('returns error name is not lower case', () => {
      expect(isValidIndexName('MyIndexName')).toBe(false);
    });
    it('returns error for .', () => {
      expect(isValidIndexName('.')).toBe(false);
    });
    it('returns error for ..', () => {
      expect(isValidIndexName('..')).toBe(false);
    });
    it('returns error if name starts with -, _,., or +', () => {
      expect(isValidIndexName('-index')).toBe(false);
      expect(isValidIndexName('_index')).toBe(false);
      expect(isValidIndexName('+index')).toBe(false);
      expect(isValidIndexName('.index')).toBe(false);

      expect(isValidIndexName('index-name')).toBe(true);
      expect(isValidIndexName('index_name')).toBe(true);
      expect(isValidIndexName('index+name')).toBe(true);
      expect(isValidIndexName('index.name')).toBe(true);
    });
    it('returns error if name contains spaces', () => {
      expect(isValidIndexName('index name')).toBe(false);
    });
    it('returns error if name contains special characters', () => {
      expect(isValidIndexName('index/name')).toBe(false);
      expect(isValidIndexName('index\\name')).toBe(false);
      expect(isValidIndexName('index*name')).toBe(false);
      expect(isValidIndexName('index?name')).toBe(false);
      expect(isValidIndexName('index"name')).toBe(false);
      expect(isValidIndexName('index<name')).toBe(false);
      expect(isValidIndexName('index>name')).toBe(false);
      expect(isValidIndexName('index|name')).toBe(false);
      expect(isValidIndexName('index,name')).toBe(false);
      expect(isValidIndexName('index#name')).toBe(false);
      expect(isValidIndexName('index:name')).toBe(false);
    });
    it('returns error exceeds 255 bytes', () => {
      const indexName = `this-is-a-long-index-name-with-unicode-characters🔥☕️🔥🔥-${'0'.repeat(
        200
      )}`;

      expect(isValidIndexName(indexName)).toBe(false);
    });
  });

  describe('generateRandomIndexName', () => {
    it('uses the default prefix and suffix length', () => {
      const name = generateRandomIndexName();
      expect(name).toMatch(/^search-[a-z0-9]{4}$/);
    });

    it('uses a custom prefix', () => {
      const name = generateRandomIndexName('logs-');
      expect(name).toMatch(/^logs-[a-z0-9]{4}$/);
    });

    it('uses a custom suffix length', () => {
      const name = generateRandomIndexName('search-', 8);
      expect(name).toMatch(/^search-[a-z0-9]{8}$/);
    });

    it('only contains lowercase alphanumeric characters in the suffix', () => {
      for (let i = 0; i < 20; i++) {
        const name = generateRandomIndexName('', 10);
        expect(name).toMatch(/^[a-z0-9]{10}$/);
      }
    });

    it('generates a valid index name', () => {
      for (let i = 0; i < 20; i++) {
        expect(isValidIndexName(generateRandomIndexName())).toBe(true);
      }
    });
  });
});
