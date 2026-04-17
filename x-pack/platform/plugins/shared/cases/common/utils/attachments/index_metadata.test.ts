/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertValidIndexMetadata, getIndexFromMetadata, isIndexMetadata } from './index_metadata';

describe('index_metadata', () => {
  describe('isIndexMetadata', () => {
    it('accepts empty metadata values', () => {
      expect(isIndexMetadata(undefined)).toBe(true);
      expect(isIndexMetadata(null)).toBe(true);
      expect(isIndexMetadata({})).toBe(true);
    });

    it('accepts string index and string[] index', () => {
      expect(isIndexMetadata({ index: 'logs-endpoint-*' })).toBe(true);
      expect(isIndexMetadata({ index: ['logs-endpoint-*', 'logs-system-*'] })).toBe(true);
    });

    it('rejects invalid metadata.index types', () => {
      expect(isIndexMetadata({ index: 123 })).toBe(false);
      expect(isIndexMetadata({ index: ['ok', 1] })).toBe(false);
      expect(isIndexMetadata('invalid')).toBe(false);
      expect(isIndexMetadata(['logs-endpoint-*'])).toBe(false);
    });
  });

  describe('assertValidIndexMetadata', () => {
    it('throws for invalid metadata values', () => {
      expect(() => assertValidIndexMetadata({ index: 123 })).toThrow(
        'metadata.index must be a string or an array of strings'
      );
    });

    it('does not throw for valid metadata values', () => {
      expect(() => assertValidIndexMetadata({ index: 'logs-endpoint-*' })).not.toThrow();
      expect(() => assertValidIndexMetadata({ index: ['logs-endpoint-*'] })).not.toThrow();
    });
  });

  describe('getIndexFromMetadata', () => {
    it('returns index when metadata is valid', () => {
      expect(getIndexFromMetadata({ index: 'logs-endpoint-*' })).toBe('logs-endpoint-*');
      expect(getIndexFromMetadata({ index: ['logs-a', 'logs-b'] })).toEqual(['logs-a', 'logs-b']);
    });

    it('returns undefined when metadata is invalid or nullish', () => {
      expect(getIndexFromMetadata(undefined)).toBeUndefined();
      expect(getIndexFromMetadata(null)).toBeUndefined();
      expect(getIndexFromMetadata({ index: 1 })).toBeUndefined();
      expect(getIndexFromMetadata(['logs-endpoint-*'])).toBeUndefined();
    });
  });
});
