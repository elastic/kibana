/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256, hashFields, defaultDiffCalculation } from './utils';

describe('#defaultDiffCalculation', () => {
  describe('empty objects', () => {
    const expected = {
      stats: { total: 0, additions: 0, deletions: 0, updates: 0 },
      type: 'default',
      fields: [],
      ignored: [],
      before: {},
      after: {},
    };

    it('should return empty diff when both objects are undefined', () => {
      const result = defaultDiffCalculation({ a: undefined, b: undefined });

      expect(result).toEqual(expected);
    });

    it('should return empty diff when both objects are empty', () => {
      const result = defaultDiffCalculation({ a: {}, b: {} });

      expect(result).toEqual(expected);
    });

    it('should return empty diff when objects are identical', () => {
      const obj = { type: 'dashboard', title: 'My Dashboard' };
      const result = defaultDiffCalculation({ a: obj, b: structuredClone(obj) });

      expect(result).toEqual(expected);
    });
  });

  describe('additions', () => {
    it('should detect additions when first object is undefined', () => {
      const a = undefined;
      const b = { type: 'dashboard', title: 'New Dashboard' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 2,
        additions: 2,
        deletions: 0,
        updates: 0,
      });
      expect(result.fields).toEqual(['type', 'title']);
      expect(result.before).toEqual({ type: undefined, title: undefined });
      expect(result.after).toEqual({ type: 'dashboard', title: 'New Dashboard' });
    });

    it('should detect additions of new properties', () => {
      const a = { type: 'dashboard' };
      const b = { type: 'dashboard', title: 'New Dashboard' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 1,
        deletions: 0,
        updates: 0,
      });
      expect(result.fields).toEqual(['title']);
      expect(result.before).toEqual({ title: undefined });
      expect(result.after).toEqual({ title: 'New Dashboard' });
    });
  });

  describe('deletions', () => {
    it('should detect deletions when second object is undefined', () => {
      const a = { type: 'dashboard', title: 'Old Dashboard' };
      const b = undefined;
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 2,
        additions: 0,
        deletions: 2,
        updates: 0,
      });
      expect(result.fields).toEqual(['type', 'title']);
      expect(result.before).toEqual({ type: 'dashboard', title: 'Old Dashboard' });
      expect(result.after).toEqual({ type: undefined, title: undefined });
    });

    it('should detect deletions when second object is empty', () => {
      const a = { title: 'Old Dashboard' };
      const b = {};
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 1,
        updates: 0,
      });
      expect(result.fields).toEqual(['title']);
      expect(result.before).toEqual({ title: 'Old Dashboard' });
      expect(result.after).toEqual({ title: undefined });
    });

    it('should detect deletion of extra properties', () => {
      const a = { type: 'dashboard', title: 'Old Dashboard' };
      const b = { type: 'dashboard' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 1,
        updates: 0,
      });
      expect(result.fields).toEqual(['title']);
      expect(result.before).toEqual({ title: 'Old Dashboard' });
    });
  });

  describe('updates', () => {
    it('should detect updates of primitive properties', () => {
      const a = { type: 'dashboard', title: 'Old Dashboard' };
      const b = { type: 'dashboard', title: 'New Dashboard' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['title']);
      expect(result.before).toEqual({ title: 'Old Dashboard' });
      expect(result.after).toEqual({ title: 'New Dashboard' });
    });

    it('should detect updates with different primitive types', () => {
      const a = { count: 5 };
      const b = { count: '5' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['count']);
      expect(result.before).toEqual({ count: 5 });
      expect(result.after).toEqual({ count: '5' });
    });

    it('should detect updates with null values', () => {
      const a = { value: 'something' };
      const b = { value: null };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['value']);
      expect(result.before).toEqual({ value: 'something' });
      expect(result.after).toEqual({ value: null });
    });
  });

  describe('nested objects', () => {
    it('should detect changes in nested properties', () => {
      const a = {
        type: 'dashboard',
        config: { theme: 'dark', layout: 'grid' },
      };
      const b = {
        type: 'dashboard',
        config: { theme: 'light', layout: 'grid' },
      };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['config.theme']);
      expect(result.before).toEqual({ config: { theme: 'dark' } });
      expect(result.after).toEqual({ config: { theme: 'light' } });
    });

    it('should detect additions in nested properties', () => {
      const a = {
        type: 'dashboard',
        config: { theme: 'dark' },
      };
      const b = {
        type: 'dashboard',
        config: { theme: 'dark', layout: 'grid' },
      };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 1,
        deletions: 0,
        updates: 0,
      });
      expect(result.fields).toEqual(['config.layout']);
      expect(result.after).toEqual({ config: { layout: 'grid' } });
    });

    it('should detect deletions in nested properties', () => {
      const a = {
        type: 'dashboard',
        config: { theme: 'dark', layout: 'grid' },
      };
      const b = {
        type: 'dashboard',
        config: { theme: 'dark' },
      };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 1,
        updates: 0,
      });
      expect(result.fields).toEqual(['config.layout']);
      expect(result.before).toEqual({ config: { layout: 'grid' } });
    });

    it('should handle deeply nested properties', () => {
      const a = {
        level1: { level2: { level3: { value: 'old' } } },
      };
      const b = {
        level1: { level2: { level3: { value: 'new' } } },
      };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['level1.level2.level3.value']);
      expect(result.before).toEqual({ level1: { level2: { level3: { value: 'old' } } } });
      expect(result.after).toEqual({ level1: { level2: { level3: { value: 'new' } } } });
    });
  });

  describe('arrays', () => {
    it('should not detect change when arrays are identical', () => {
      const a = { tags: ['tag1', 'tag2'] };
      const b = { tags: ['tag1', 'tag2'] };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 0,
        additions: 0,
        deletions: 0,
        updates: 0,
      });
    });

    it('should detect update when array values change', () => {
      const a = { tags: ['tag1', 'tag2'] };
      const b = { tags: ['tag1', 'tag3'] };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['tags']);
      expect(result.before).toEqual({ tags: ['tag1', 'tag2'] });
      expect(result.after).toEqual({ tags: ['tag1', 'tag3'] });
    });

    it('should detect update when array order changes', () => {
      const a = { tags: ['tag1', 'tag2'] };
      const b = { tags: ['tag2', 'tag1'] };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['tags']);
      expect(result.before).toEqual({ tags: ['tag1', 'tag2'] });
      expect(result.after).toEqual({ tags: ['tag2', 'tag1'] });
    });

    it('should detect update when array length changes', () => {
      const a = { tags: ['tag1', 'tag2'] };
      const b = { tags: ['tag1', 'tag2', 'tag3'] };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['tags']);
      expect(result.before).toEqual({ tags: ['tag1', 'tag2'] });
      expect(result.after).toEqual({ tags: ['tag1', 'tag2', 'tag3'] });
    });

    it('should detect addition when array is added', () => {
      const a = { type: 'dashboard' };
      const b = { type: 'dashboard', tags: ['tag1'] };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 1,
        deletions: 0,
        updates: 0,
      });
      expect(result.fields).toEqual(['tags']);
      expect(result.before).toEqual({ tags: undefined });
      expect(result.after).toEqual({ tags: ['tag1'] });
    });

    it('should detect changes in arrays with nested objects', () => {
      const a = { items: [{ id: 1, name: 'Item 1' }] };
      const b = {
        items: [{ id: 1, name: 'Item 1 Updated' }],
      };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['items']);
      expect(result.before).toEqual({ items: [{ id: 1, name: 'Item 1' }] });
      expect(result.after).toEqual({ items: [{ id: 1, name: 'Item 1 Updated' }] });
    });

    it('should detect deletion inside arrays', () => {
      const a = { tags: ['tag1'] };
      const b = { tags: [] };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fields).toEqual(['tags']);
      expect(result.before).toEqual({ tags: ['tag1'] });
      expect(result.after).toEqual({ tags: [] });
    });
  });

  describe('mixed changes', () => {
    it('should detect multiple types of changes', () => {
      const a = {
        type: 'dashboard',
        title: 'Old Title',
        description: 'To be deleted',
        config: { theme: 'dark' },
      };
      const b = {
        type: 'dashboard',
        title: 'New Title',
        author: 'John Doe',
        config: { theme: 'light' },
      };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 4,
        additions: 1,
        deletions: 1,
        updates: 2,
      });
      // Using `.sort()` below because we're not depending on array order.
      // @see https://stackoverflow.com/questions/40135684
      expect(result.fields.sort()).toEqual(
        ['author', 'config.theme', 'description', 'title'].sort()
      );
    });

    it('should correctly count stats with complex nested changes', () => {
      const a = {
        metadata: { created: '2023-01-01', author: 'Alice' },
        content: { title: 'Old' },
      };
      const b = {
        metadata: { created: '2023-01-01', updated: '2023-01-02' },
        content: { title: 'New', tags: ['test'] },
      };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.additions).toBe(2); // updated, tags
      expect(result.stats.deletions).toBe(1); // author
      expect(result.stats.updates).toBe(1); // title
      expect(result.stats.total).toBe(4);
    });
  });

  describe('with filter', () => {
    it('should filter to only include specified fields', () => {
      const a = {
        type: 'dashboard',
        title: 'Old Title',
        description: 'Old Description',
      };
      const b = {
        type: 'dashboard',
        title: 'New Title',
        description: 'New Description',
      };
      const fieldsToIgnore = { type: true, description: true };
      const result = defaultDiffCalculation({ a, b, fieldsToIgnore });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      // Using `.sort()` below because we're not depending on array order.
      // @see https://stackoverflow.com/questions/40135684
      expect(result.ignored.sort()).toEqual(['description', 'type'].sort());
      expect(result.fields).toEqual(['title']);
      expect(result.after).toEqual({ title: 'New Title' });
    });

    it('should filter nested properties', () => {
      const a = {
        type: 'dashboard',
        config: { theme: 'dark', layout: 'grid' },
        metadata: { author: 'Alice', version: 1 },
      };
      const b = {
        type: 'dashboard',
        config: { theme: 'light', layout: 'list' },
        metadata: { author: 'Bob', version: 2 },
      };
      const fieldsToIgnore = { config: { layout: true }, metadata: true };
      const result = defaultDiffCalculation({ a, b, fieldsToIgnore });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      // Using `.sort()` below because we're not depending on array order.
      // @see https://stackoverflow.com/questions/40135684
      expect(result.ignored.sort()).toEqual(
        ['config.layout', 'metadata.author', 'metadata.version'].sort()
      );
      expect(result.fields).toEqual(['config.theme']);
    });

    it('should return empty diff when filter excludes all changes', () => {
      const a = { title: 'Old' };
      const b = { title: 'New' };
      const fieldsToIgnore = { title: true };
      const result = defaultDiffCalculation({ a, b, fieldsToIgnore });

      expect(result.stats).toEqual({
        total: 0,
        additions: 0,
        deletions: 0,
        updates: 0,
      });
      expect(result.ignored).toEqual(['title']);
    });

    it('should handle filter with multiple properties', () => {
      const a = {
        title: 'Old Title',
        description: 'Old Description',
        author: 'Alice',
        version: 1,
      };
      const b = {
        title: 'New Title',
        description: 'New Description',
        author: 'Bob',
        version: 2,
      };
      const fieldsToIgnore = { description: true, version: true };
      const result = defaultDiffCalculation({ a, b, fieldsToIgnore });

      expect(result.stats).toEqual({
        total: 2,
        additions: 0,
        deletions: 0,
        updates: 2,
      });
      // Using `.sort()` below because we're not depending on array order.
      // @see https://stackoverflow.com/questions/40135684
      expect(result.ignored.sort()).toEqual(['description', 'version'].sort());
      expect(result.fields.sort()).toEqual(['author', 'title'].sort());
    });

    it('should handle filter with nested property using partial key matching', () => {
      const a = {
        config: { theme: 'dark', layout: { columns: 2 } },
      };
      const b = {
        config: { theme: 'light', layout: { columns: 3 } },
      };
      const fieldsToIgnore = { config: { layout: true } };
      const result = defaultDiffCalculation({ a, b, fieldsToIgnore });

      expect(result.ignored).toEqual(['config.layout.columns']);
      expect(result.fields).toEqual(['config.theme']);
    });
  });

  describe('edge cases', () => {
    it('should handle boolean values', () => {
      const a = { enabled: true };
      const b = { enabled: false };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.before).toEqual({ enabled: true });
      expect(result.after).toEqual({ enabled: false });
    });

    it('should handle zero values', () => {
      const a = { count: 0 };
      const b = { count: 1 };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.before).toEqual({ count: 0 });
      expect(result.after).toEqual({ count: 1 });
    });

    it('should handle negative zero values', () => {
      const a = { count: -0 };
      const b = { count: 0 };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.updates).toBe(0);
    });

    it('should handle empty strings', () => {
      const a = { title: '' };
      const b = { title: 'New Title' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.before).toEqual({ title: '' });
      expect(result.after).toEqual({ title: 'New Title' });
    });

    it('should treat null as a value, not undefined', () => {
      const a = { value: null };
      const b = { value: 'something' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.before).toEqual({ value: null });
      expect(result.after).toEqual({ value: 'something' });
    });

    it.each([
      ['my-property', 'hyphen'],
      ['my_property', 'underscore'],
      // ['my.property', 'dot'], // TODO: Fix this. Problem with unflattening output.
      // ['my[0]', 'brackets'], // TODO: Fix this. Problem with unflattening output.,
      ['@mention', 'at sign'],
      ['$variable', 'dollar'],
      ['ns:name', 'colon'],
      ['path/to', 'slash'],
      ['my property', 'space'],
      ['café', 'unicode'],
    ])('should handle special characters in property names (%s - %s)', (propName, _description) => {
      const a = { [propName]: 'old' };
      const b = { [propName]: 'new' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.fields).toEqual([propName]);
      expect(result.before).toEqual({ [propName]: 'old' });
      expect(result.after).toEqual({ [propName]: 'new' });
    });

    // NOTE: We do not currently support this.
    // However, keeping this test as it might become useful later.
    it.skip('should handle property names with a dot in the middle', () => {
      const a = {
        'user.name': 'jane',
        user: { name: 'jane-nested' },
        'user\\.name': 'jane-escaped',
        'user..name': 'jane-doubledot',
        'user.data': { name: 'jane-dot-nested' },
        data: { 'user.name': 'jane-nested-dot' },
        'user\\.data': { name: 'jane-escaped-nested' },
      };
      const b = {
        'user.name': 'bob',
        user: { name: 'bob-nested' },
        'user\\.name': 'bob-escaped',
        'user..name': 'bob-doubledot',
        'user.data': { name: 'bob-dot-nested' },
        data: { 'user.name': 'bob-nested-dot' },
        'user\\.data': { name: 'bob-escaped-nested' },
      };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.updates).toBe(7);
      // Using `.sort()` below because we're not depending on array order.
      // @see https://stackoverflow.com/questions/40135684
      expect(result.fields.sort()).toEqual(
        [
          'user\\.name',
          'user.name',
          'user\\\\.name',
          'user\\.\\.name',
          'user\\.data.name',
          'data.user\\.name',
          'user\\\\.data.name',
        ].sort()
      );
      expect(result.before).toEqual({
        'user\\.name': 'jane',
        'user.name': 'jane-nested',
        'user\\\\.name': 'jane-escaped',
        'user\\.\\.name': 'jane-doubledot',
        'user\\.data.name': 'jane-dot-nested',
        'data.user\\.name': 'jane-nested-dot',
        'user\\\\.data.name': 'jane-escaped-nested',
      });
      expect(result.after).toEqual({
        'user\\.name': 'bob',
        'user.name': 'bob-nested',
        'user\\\\.name': 'bob-escaped',
        'user\\.\\.name': 'bob-doubledot',
        'user\\.data.name': 'bob-dot-nested',
        'data.user\\.name': 'bob-nested-dot',
        'user\\\\.data.name': 'bob-escaped-nested',
      });
    });

    it('should handle numeric property names', () => {
      const a = { '123': 'old' };
      const b = { '123': 'new' };
      const result = defaultDiffCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
    });

    describe('JSON-like behavior', () => {
      it('should handle NaN values', () => {
        const a = { value: NaN };
        const b = { value: 42 };
        const result = defaultDiffCalculation({ a, b });

        // NaN is serialized as null by JSON.stringify
        expect(result.stats.updates).toBe(1);
        expect(result.before.value).toBe(NaN);
        expect(result.after.value).toBe(42);
      });

      it('should handle NaN in both objects', () => {
        const a = { value: NaN };
        const b = { value: NaN };
        const result = defaultDiffCalculation({ a, b });

        // // NaN is never equal to NaN
        expect(result.stats.total).toBe(1);
      });

      it('should handle Infinity values (treated as null by flatten/JSON)', () => {
        const a = { value: Infinity };
        const b = { value: 100 };
        const result = defaultDiffCalculation({ a, b });

        // Infinity is serialized as null by JSON.stringify
        expect(result.stats.updates).toBe(1);
        expect(result.before.value).toBe(Infinity);
        expect(result.after.value).toBe(100);
      });

      it('should handle negative Infinity values', () => {
        const a = { value: -Infinity };
        const b = { value: -100 };
        const result = defaultDiffCalculation({ a, b });

        // -Infinity is serialized as null by JSON.stringify
        expect(result.stats.updates).toBe(1);
        expect(result.before.value).toBe(-Infinity);
        expect(result.after.value).toBe(-100);
      });

      it('should handle Infinity in both objects', () => {
        const a = { value: Infinity };
        const b = { value: Infinity };
        const result = defaultDiffCalculation({ a, b });

        // Both Infinity values become null, so no difference
        expect(result.stats.total).toBe(0);
      });

      it('should handle NaN and Infinity in arrays', () => {
        const a = { values: [1, NaN, Infinity] };
        const b = { values: [1, 2, 3] };
        const result = defaultDiffCalculation({ a, b });

        // Arrays are compared using JSON.stringify, which converts NaN/Infinity to null
        // [1, NaN, Infinity] becomes [1, null, null]
        expect(result.stats.updates).toBe(1);
        expect(result.before.values).toEqual([1, NaN, Infinity]);
        expect(result.after.values).toEqual([1, 2, 3]);
      });

      it('should throw TypeError for BigInt values like JSON.stringify', () => {
        const a = { value: BigInt(123) };
        const b = { value: BigInt(456) };

        // BigInt throws when serialised to JSON
        expect(() => defaultDiffCalculation({ a, b })).toThrow(TypeError);
      });

      it('should throw TypeError for BigInt in nested objects', () => {
        const a = {
          config: { largeNumber: BigInt(9007199254740991) },
        };
        const b = {
          config: { largeNumber: BigInt(9007199254740992) },
        };

        expect(() => defaultDiffCalculation({ a, b })).toThrow();
      });

      it('should throw TypeError for BigInt in arrays', () => {
        const a = { values: [1, 2, BigInt(3)] };
        const b = { values: [1, 2, BigInt(4)] };

        // JSON.stringify throws when encountering BigInt in arrays
        expect(() => defaultDiffCalculation({ a, b })).toThrow(TypeError);
      });

      it('should ignore functions in objects (omitted in JSON)', () => {
        const a = { value: 'test', fn() {} };
        const b = { value: 'test' };
        const result = defaultDiffCalculation({ a, b });

        // Functions are omitted during JSON serialization
        expect(result.stats.total).toEqual(0);
        expect(result.fields).toEqual([]);
      });

      it('should handle symbols in objects (omitted in JSON)', () => {
        const sym = Symbol('test');
        const a = { value: 'test', [sym]: 'symbol-value' };
        const b = { value: 'changed' };
        const result = defaultDiffCalculation({ a, b });

        // Symbols are omitted during JSON serialization
        expect(result.stats.updates).toBe(1);
        expect(result.fields).toEqual(['value']);
      });

      it('should handle TypedArrays (same as JSON)', () => {
        const a = { data: new Uint8Array([1, 2, 3]) };
        const b = { data: new Uint8Array([1, 2, 4]) };
        const result = defaultDiffCalculation({ a, b });

        const outputA = JSON.parse(JSON.stringify(a));
        const outputB = JSON.parse(JSON.stringify(b));

        expect(result.stats.updates).toBe(1);
        expect(result.fields).toEqual(['data']);
        expect(result.before).toEqual(outputA);
        expect(result.after).toEqual(outputB);
      });

      it('should handle identical TypedArrays objects', () => {
        const a = { data: new Uint8Array([1, 2, 3]) };
        const b = { data: new Uint8Array([1, 2, 3]) };
        const result = defaultDiffCalculation({ a, b });

        expect(result.fields).toEqual([]);
        expect(result.stats.total).toBe(0);
      });

      it('should handle TypedArrays with different lengths as an update', () => {
        const a = { data: new Uint8Array([]) };
        const b = { data: new Uint8Array([1, 2]) };
        const result = defaultDiffCalculation({ a, b });

        expect(result.stats.updates).toBe(1);
        expect(result.fields).toEqual(['data']);
      });
    });
  });
});

describe('#hashFields', () => {
  describe('when fieldsToHash is not provided', () => {
    it('should return snapshot unchanged and empty hashed paths', () => {
      const snapshot = { user: { email: 'bob@example.com' } };
      const result = hashFields(snapshot);

      expect(result.fields).toEqual([]);
      expect(result.snapshot).toEqual(snapshot);
    });
  });

  describe('when fieldsToHash is undefined', () => {
    it('should return snapshot unchanged and empty hashed paths', () => {
      const snapshot = { secret: 'sensitive' };
      const result = hashFields(snapshot, undefined);

      expect(result.fields).toEqual([]);
      expect(result.snapshot).toEqual(snapshot);
    });
  });

  describe('single field hashing', () => {
    it('should hash a top-level string field and list its path', () => {
      const snapshot = { user: { email: 'bob@example.com' } };
      const fieldsToHash = { user: true };
      const result = hashFields(snapshot, fieldsToHash);

      expect(result.fields).toEqual(['user.email']);
      expect(result.snapshot.user.email).toBe(sha256('bob@example.com'));
      expect(result.snapshot.user.email).not.toBe('bob@example.com');
    });

    it('should hash a nested field when only that path is in fieldsToHash', () => {
      const snapshot = { user: { email: 'bob@example.com', name: 'Bob' } };
      const fieldsToHash = { user: { email: true } };
      const result = hashFields(snapshot, fieldsToHash);

      expect(result.fields).toEqual(['user.email']);
      expect(result.snapshot.user.email).toBe(sha256('bob@example.com'));
      expect(result.snapshot.user.name).toBe('Bob');
    });
  });

  describe('multiple fields hashing', () => {
    it('should hash multiple string fields and list all paths', () => {
      const snapshot = {
        user: { email: 'bob@example.com', apiKey: 'secret-key-123' },
        token: 'abc-token',
      };
      const fieldsToHash = { user: true, token: true };
      const result = hashFields(snapshot, fieldsToHash);

      // Using `.sort()` below because we're not depending on array order.
      // @see https://stackoverflow.com/questions/40135684
      expect(result.fields.sort()).toEqual(['token', 'user.apiKey', 'user.email'].sort());
      expect(result.snapshot.user.email).toBe(sha256('bob@example.com'));
      expect(result.snapshot.user.apiKey).toBe(sha256('secret-key-123'));
      expect(result.snapshot.token).toBe(sha256('abc-token'));
    });
  });

  describe('non-string values', () => {
    it('should not hash non-string values even when key is in fieldsToHash', () => {
      const snapshot = { config: { count: 42, enabled: true, nested: { id: 1 } } };
      const fieldsToHash = { config: true };
      const result = hashFields(snapshot, fieldsToHash);

      expect(result.fields).toEqual([]);
      expect(result.snapshot).toEqual(snapshot);
    });

    it('should hash only string fields and leave numbers/booleans unchanged', () => {
      const snapshot = {
        user: { email: 'bob@example.com', count: 5, active: true },
      };
      const fieldsToHash = { user: true };
      const result = hashFields(snapshot, fieldsToHash);

      expect(result.fields).toEqual(['user.email']);
      expect(result.snapshot.user.email).toBe(sha256('bob@example.com'));
      expect(result.snapshot.user.count).toBe(5);
      expect(result.snapshot.user.active).toBe(true);
    });
  });

  describe('unhashed fields', () => {
    it('should leave paths outside fieldsToHash unchanged', () => {
      const snapshot = {
        user: { email: 'bob@example.com', name: 'Bob' },
        title: 'My Dashboard',
      };
      const fieldsToHash = { user: { email: true } };
      const result = hashFields(snapshot, fieldsToHash);

      expect(result.snapshot.user.name).toBe('Bob');
      expect(result.snapshot.title).toBe('My Dashboard');
    });
  });

  describe('hash format', () => {
    it('should produce deterministic digest for the same input', () => {
      const snapshot = { secret: 'same-value' };
      const fieldsToHash = { secret: true };
      const result1 = hashFields(snapshot, fieldsToHash);
      const result2 = hashFields(snapshot, fieldsToHash);

      expect(result1.snapshot.secret).toBe(result2.snapshot.secret);
    });

    it('should store the full sha256 hex digest', () => {
      const snapshot = { secret: 'test' };
      const fieldsToHash = { secret: true };
      const result = hashFields(snapshot, fieldsToHash);

      expect(result.snapshot.secret).toEqual(sha256('test'));
    });
  });

  describe('edge cases', () => {
    it('should handle empty snapshot', () => {
      const result = hashFields({}, { user: true });

      expect(result.fields).toEqual([]);
      expect(result.snapshot).toEqual({});
    });

    it('should handle empty string value', () => {
      const snapshot = { secret: '' };
      const fieldsToHash = { secret: true };
      const result = hashFields(snapshot, fieldsToHash);

      expect(result.fields).toEqual(['secret']);
      expect(result.snapshot.secret).toBe(sha256(''));
    });

    it('should not mutate the original snapshot', () => {
      const user = { email: 'bob@example.com' };
      const snapshot = { user };
      const fieldsToHash = { user: true };
      hashFields(snapshot, fieldsToHash);

      expect(snapshot.user).toBe(user);
    });
  });
});
