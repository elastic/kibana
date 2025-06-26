/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidIndexName } from './utils';

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
});
