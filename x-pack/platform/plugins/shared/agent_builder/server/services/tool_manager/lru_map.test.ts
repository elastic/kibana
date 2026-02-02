/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUMap } from './lru_map';

describe('LRUMap', () => {
  describe('constructor', () => {
    it('creates an LRUMap with the specified capacity', () => {
      const map = new LRUMap<string, number>(5);
      expect(map.size).toBe(0);
    });

    it('throws an error when capacity is zero', () => {
      expect(() => new LRUMap<string, number>(0)).toThrow('LRUMap capacity must be > 0');
    });

    it('throws an error when capacity is negative', () => {
      expect(() => new LRUMap<string, number>(-1)).toThrow('LRUMap capacity must be > 0');
    });
  });

  describe('size', () => {
    it('returns 0 for an empty map', () => {
      const map = new LRUMap<string, number>(5);
      expect(map.size).toBe(0);
    });

    it('returns the correct size after adding items', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      expect(map.size).toBe(2);
    });

    it('does not increase size when updating existing key', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('a', 2);
      expect(map.size).toBe(1);
    });

    it('decreases size when deleting items', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.delete('a');
      expect(map.size).toBe(1);
    });
  });

  describe('set', () => {
    it('adds a new key-value pair', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      expect(map.get('a')).toBe(1);
      expect(map.size).toBe(1);
    });

    it('updates existing key-value pair', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('a', 2);
      expect(map.get('a')).toBe(2);
      expect(map.size).toBe(1);
    });

    it('moves updated key to head', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('a', 3);
      expect(map.values()).toEqual([3, 2]);
    });

    it('evicts least recently used item when capacity is exceeded', () => {
      const map = new LRUMap<string, number>(3);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.set('d', 4);
      expect(map.has('a')).toBe(false);
      expect(map.has('b')).toBe(true);
      expect(map.has('c')).toBe(true);
      expect(map.has('d')).toBe(true);
    });

    it('evicts in correct order (LRU first)', () => {
      const map = new LRUMap<string, number>(3);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      // Access 'a' to make it MRU
      map.get('a');
      // Now 'b' should be LRU
      map.set('d', 4);
      expect(map.has('b')).toBe(false);
      expect(map.has('a')).toBe(true);
      expect(map.has('c')).toBe(true);
      expect(map.has('d')).toBe(true);
    });
  });

  describe('get', () => {
    it('returns undefined for non-existent key', () => {
      const map = new LRUMap<string, number>(5);
      expect(map.get('nonexistent')).toBeUndefined();
    });

    it('returns the correct value for existing key', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      expect(map.get('a')).toBe(1);
    });

    it('moves accessed key to head', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.get('a');
      expect(map.values()).toEqual([1, 3, 2]);
    });

    it('does not change order when accessing head item', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.get('a');
      expect(map.values()).toEqual([1, 2]);
    });
  });

  describe('has', () => {
    it('returns false for non-existent key', () => {
      const map = new LRUMap<string, number>(5);
      expect(map.has('nonexistent')).toBe(false);
    });

    it('returns true for existing key', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      expect(map.has('a')).toBe(true);
    });

    it('returns false after deletion', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.delete('a');
      expect(map.has('a')).toBe(false);
    });
  });

  describe('delete', () => {
    it('returns false for non-existent key', () => {
      const map = new LRUMap<string, number>(5);
      expect(map.delete('nonexistent')).toBe(false);
    });

    it('returns true when deleting existing key', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      expect(map.delete('a')).toBe(true);
    });

    it('removes the key-value pair', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.delete('a');
      expect(map.has('a')).toBe(false);
      expect(map.get('a')).toBeUndefined();
    });

    it('maintains correct order after deletion', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.delete('b');
      expect(map.values()).toEqual([3, 1]);
    });

    it('handles deleting head item', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.delete('b');
      expect(map.values()).toEqual([1]);
    });

    it('handles deleting tail item', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.delete('a');
      expect(map.values()).toEqual([2]);
    });

    it('handles deleting middle item', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.delete('b');
      expect(map.values()).toEqual([3, 1]);
    });
  });

  describe('clear', () => {
    it('removes all items from the map', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.clear();
      expect(map.size).toBe(0);
      expect(map.has('a')).toBe(false);
      expect(map.has('b')).toBe(false);
      expect(map.has('c')).toBe(false);
    });

    it('works on empty map', () => {
      const map = new LRUMap<string, number>(5);
      map.clear();
      expect(map.size).toBe(0);
    });
  });

  describe('values', () => {
    it('returns empty array for empty map', () => {
      const map = new LRUMap<string, number>(5);
      expect(map.values()).toEqual([]);
    });

    it('returns values in MRU to LRU order', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      expect(map.values()).toEqual([3, 2, 1]);
    });

    it('updates order after access', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.get('a');
      expect(map.values()).toEqual([1, 3, 2]);
    });

    it('updates order after update', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.set('a', 10);
      expect(map.values()).toEqual([10, 3, 2]);
    });
  });

  describe('complex scenarios', () => {
    it('handles capacity of 1', () => {
      const map = new LRUMap<string, number>(1);
      map.set('a', 1);
      expect(map.get('a')).toBe(1);
      map.set('b', 2);
      expect(map.has('a')).toBe(false);
      expect(map.get('b')).toBe(2);
    });

    it('maintains correct order through multiple operations', () => {
      const map = new LRUMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      map.get('a');
      map.set('d', 4);
      map.delete('c');
      map.set('e', 5);
      expect(map.values()).toEqual([5, 4, 1, 2]);
    });

    it('handles rapid insertions and deletions', () => {
      const map = new LRUMap<string, number>(3);
      for (let i = 0; i < 10; i++) {
        map.set(`key${i}`, i);
      }
      expect(map.size).toBe(3);
      expect(map.has('key7')).toBe(true);
      expect(map.has('key8')).toBe(true);
      expect(map.has('key9')).toBe(true);
    });
  });
});
