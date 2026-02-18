/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import flatten from 'flat';
import { standardDiffDocCalculation } from './utils';

describe('#standardDiffDocCalculation', () => {
  describe('empty objects', () => {
    it('should return empty diff when both objects are undefined', () => {
      const result = standardDiffDocCalculation({ a: undefined, b: undefined });

      expect(result).toEqual({
        stats: { total: 0, additions: 0, deletions: 0, updates: 0 },
        fieldChanges: [],
        oldvalues: {},
        newvalues: {},
      });
    });

    it('should return empty diff when both objects are empty', () => {
      const obj = {};
      const result = standardDiffDocCalculation({ a: obj, b: structuredClone(obj) });

      expect(result).toEqual({
        stats: { total: 0, additions: 0, deletions: 0, updates: 0 },
        fieldChanges: [],
        oldvalues: {},
        newvalues: {},
      });
    });

    it('should return empty diff when objects are identical', () => {
      const obj = { type: 'dashboard', title: 'My Dashboard' };
      const result = standardDiffDocCalculation({ a: obj, b: structuredClone(obj) });

      expect(result).toEqual({
        stats: { total: 0, additions: 0, deletions: 0, updates: 0 },
        fieldChanges: [],
        oldvalues: {},
        newvalues: {},
      });
    });
  });

  describe('additions', () => {
    it('should detect additions when first object is undefined', () => {
      const b = { type: 'dashboard', title: 'New Dashboard' };
      const result = standardDiffDocCalculation({ a: undefined, b });

      expect(result.stats).toEqual({
        total: 2,
        additions: 2,
        deletions: 0,
        updates: 0,
      });
      expect(result.fieldChanges).toEqual(['type', 'title']);
      expect(result.oldvalues).toEqual({ type: undefined, title: undefined });
      expect(result.newvalues).toEqual({ type: 'dashboard', title: 'New Dashboard' });
    });

    it('should detect additions of new properties', () => {
      const a = { type: 'dashboard' };
      const b = { type: 'dashboard', title: 'New Dashboard' };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 1,
        deletions: 0,
        updates: 0,
      });
      expect(result.fieldChanges).toEqual(['title']);
      expect(result.newvalues).toEqual({ title: 'New Dashboard' });
    });
  });

  describe('deletions', () => {
    it('should detect deletions when second object is undefined', () => {
      const a = { type: 'dashboard', title: 'Old Dashboard' };
      const result = standardDiffDocCalculation({ a, b: undefined });

      expect(result.stats).toEqual({
        total: 2,
        additions: 0,
        deletions: 2,
        updates: 0,
      });
      expect(result.fieldChanges).toEqual(['type', 'title']);
      expect(result.oldvalues).toEqual({ type: 'dashboard', title: 'Old Dashboard' });
      expect(result.newvalues).toEqual({ type: undefined, title: undefined });
    });

    it('should detect deletions when second object is empty', () => {
      const a = { title: 'Old Dashboard' };
      const b = {};
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 1,
        updates: 0,
      });
      expect(result.fieldChanges).toEqual(['title']);
      expect(result.oldvalues).toEqual({ title: 'Old Dashboard' });
      expect(result.newvalues).toEqual({ title: undefined });
    });

    it('should detect deletion of extra properties', () => {
      const a = { type: 'dashboard', title: 'Old Dashboard' };
      const b = { type: 'dashboard' };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 1,
        updates: 0,
      });
      expect(result.fieldChanges).toEqual(['title']);
      expect(result.oldvalues).toEqual({ title: 'Old Dashboard' });
    });
  });

  describe('updates', () => {
    it('should detect updates of primitive properties', () => {
      const a = { type: 'dashboard', title: 'Old Dashboard' };
      const b = { type: 'dashboard', title: 'New Dashboard' };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fieldChanges).toEqual(['title']);
      expect(result.oldvalues).toEqual({ title: 'Old Dashboard' });
      expect(result.newvalues).toEqual({ title: 'New Dashboard' });
    });

    it('should detect updates with different primitive types', () => {
      const a = { count: 5 };
      const b = { count: '5' };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.oldvalues).toEqual({ count: 5 });
      expect(result.newvalues).toEqual({ count: '5' });
    });

    it('should detect updates with null values', () => {
      const a = { value: 'something' };
      const b = { value: null };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.oldvalues).toEqual({ value: 'something' });
      expect(result.newvalues).toEqual({ value: null });
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
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fieldChanges).toEqual(['config.theme']);
      expect(result.oldvalues).toEqual({ 'config.theme': 'dark' });
      expect(result.newvalues).toEqual({ 'config.theme': 'light' });
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
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 1,
        deletions: 0,
        updates: 0,
      });
      expect(result.fieldChanges).toEqual(['config.layout']);
      expect(result.newvalues).toEqual({ 'config.layout': 'grid' });
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
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 1,
        updates: 0,
      });
      expect(result.fieldChanges).toEqual(['config.layout']);
      expect(result.oldvalues).toEqual({ 'config.layout': 'grid' });
    });

    it('should handle deeply nested properties', () => {
      const a = {
        level1: { level2: { level3: { value: 'old' } } },
      };
      const b = {
        level1: { level2: { level3: { value: 'new' } } },
      };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fieldChanges).toEqual(['level1.level2.level3.value']);
      expect(result.oldvalues).toEqual({ 'level1.level2.level3.value': 'old' });
      expect(result.newvalues).toEqual({ 'level1.level2.level3.value': 'new' });
    });
  });

  describe('arrays', () => {
    it('should not detect change when arrays are identical', () => {
      const a = { tags: ['tag1', 'tag2'] };
      const b = { tags: ['tag1', 'tag2'] };
      const result = standardDiffDocCalculation({ a, b });

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
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fieldChanges).toEqual(['tags']);
      expect(result.oldvalues).toEqual({ tags: ['tag1', 'tag2'] });
      expect(result.newvalues).toEqual({ tags: ['tag1', 'tag3'] });
    });

    it('should detect update when array order changes', () => {
      const a = { tags: ['tag1', 'tag2'] };
      const b = { tags: ['tag2', 'tag1'] };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.oldvalues).toEqual({ tags: ['tag1', 'tag2'] });
      expect(result.newvalues).toEqual({ tags: ['tag2', 'tag1'] });
    });

    it('should detect update when array length changes', () => {
      const a = { tags: ['tag1', 'tag2'] };
      const b = { tags: ['tag1', 'tag2', 'tag3'] };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.oldvalues).toEqual({ tags: ['tag1', 'tag2'] });
      expect(result.newvalues).toEqual({ tags: ['tag1', 'tag2', 'tag3'] });
    });

    it('should detect addition when array is added', () => {
      const a = { type: 'dashboard' };
      const b = { type: 'dashboard', tags: ['tag1'] };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 1,
        deletions: 0,
        updates: 0,
      });
      expect(result.newvalues).toEqual({ tags: ['tag1'] });
    });

    it('should detect changes in arrays with nested objects', () => {
      const a = { items: [{ id: 1, name: 'Item 1' }] };
      const b = {
        items: [{ id: 1, name: 'Item 1 Updated' }],
      };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fieldChanges).toEqual(['items']);
    });

    it('should detect deletion inside arrays', () => {
      const a = { tags: ['tag1'] };
      const b = { tags: [] };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.oldvalues).toEqual({ tags: ['tag1'] });
      expect(result.newvalues).toEqual({ tags: [] });
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
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats).toEqual({
        total: 4,
        additions: 1,
        deletions: 1,
        updates: 2,
      });
      expect(result.fieldChanges.sort()).toEqual(
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
      const result = standardDiffDocCalculation({ a, b });

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
      const excludeFields = { type: true, description: true };
      const result = standardDiffDocCalculation({ a, b, excludeFields });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fieldChanges).toEqual(['title']);
      expect(result.newvalues).toEqual({ title: 'New Title' });
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
      const excludeFields = { config: { layout: true }, metadata: true };
      const result = standardDiffDocCalculation({ a, b, excludeFields });

      expect(result.stats).toEqual({
        total: 1,
        additions: 0,
        deletions: 0,
        updates: 1,
      });
      expect(result.fieldChanges).toEqual(['config.theme']);
    });

    it('should return empty diff when filter excludes all changes', () => {
      const a = { title: 'Old' };
      const b = { title: 'New' };
      const excludeFields = { title: true };
      const result = standardDiffDocCalculation({ a, b, excludeFields });

      expect(result.stats).toEqual({
        total: 0,
        additions: 0,
        deletions: 0,
        updates: 0,
      });
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
      const excludeFields = { description: true, version: true };
      const result = standardDiffDocCalculation({ a, b, excludeFields });

      expect(result.stats).toEqual({
        total: 2,
        additions: 0,
        deletions: 0,
        updates: 2,
      });
      expect(result.fieldChanges.sort()).toEqual(['author', 'title'].sort());
    });

    it('should handle filter with nested property using partial key matching', () => {
      const a = {
        config: { theme: 'dark', layout: { columns: 2 } },
      };
      const b = {
        config: { theme: 'light', layout: { columns: 3 } },
      };
      const excludeFields = { config: { theme: true } };
      const result = standardDiffDocCalculation({ a, b, excludeFields });

      expect(result.fieldChanges).toContain('config.layout.columns');
    });
  });

  describe('edge cases', () => {
    it('should handle boolean values', () => {
      const a = { enabled: true };
      const b = { enabled: false };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.oldvalues).toEqual({ enabled: true });
      expect(result.newvalues).toEqual({ enabled: false });
    });

    it('should handle zero values', () => {
      const a = { count: 0 };
      const b = { count: 1 };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.oldvalues).toEqual({ count: 0 });
      expect(result.newvalues).toEqual({ count: 1 });
    });

    it('should handle negative zero values', () => {
      const a = { count: -0 };
      const b = { count: 0 };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats.updates).toBe(0);
    });

    it('should handle empty strings', () => {
      const a = { title: '' };
      const b = { title: 'New Title' };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.oldvalues).toEqual({ title: '' });
      expect(result.newvalues).toEqual({ title: 'New Title' });
    });

    it('should treat null as a value, not undefined', () => {
      const a = { value: null };
      const b = { value: 'something' };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.oldvalues).toEqual({ value: null });
      expect(result.newvalues).toEqual({ value: 'something' });
    });

    it('should handle special characters in property names', () => {
      const a = { 'my-property': 'old' };
      const b = { 'my-property': 'new' };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
      expect(result.fieldChanges).toEqual(['my-property']);
    });

    it('should handle numeric property names', () => {
      const a = { '123': 'old' };
      const b = { '123': 'new' };
      const result = standardDiffDocCalculation({ a, b });

      expect(result.stats.updates).toBe(1);
    });

    describe('JSON-like behavior', () => {
      it('should handle NaN values', () => {
        const a = { value: NaN };
        const b = { value: 42 };
        const result = standardDiffDocCalculation({ a, b });

        // NaN is serialized as null by JSON.stringify
        expect(result.stats.updates).toBe(1);
        expect(result.oldvalues.value).toBe(NaN);
        expect(result.newvalues.value).toBe(42);
      });

      it('should handle NaN in both objects', () => {
        const a = { value: NaN };
        const b = { value: NaN };
        const result = standardDiffDocCalculation({ a, b });

        // // NaN is never equal to NaN
        expect(result.stats.total).toBe(1);
      });

      it('should handle Infinity values (treated as null by flatten/JSON)', () => {
        const a = { value: Infinity };
        const b = { value: 100 };
        const result = standardDiffDocCalculation({ a, b });

        // Infinity is serialized as null by JSON.stringify
        expect(result.stats.updates).toBe(1);
        expect(result.oldvalues.value).toBe(Infinity);
        expect(result.newvalues.value).toBe(100);
      });

      it('should handle negative Infinity values', () => {
        const a = { value: -Infinity };
        const b = { value: -100 };
        const result = standardDiffDocCalculation({ a, b });

        // -Infinity is serialized as null by JSON.stringify
        expect(result.stats.updates).toBe(1);
        expect(result.oldvalues.value).toBe(-Infinity);
        expect(result.newvalues.value).toBe(-100);
      });

      it('should handle Infinity in both objects', () => {
        const a = { value: Infinity };
        const b = { value: Infinity };
        const result = standardDiffDocCalculation({ a, b });

        // Both Infinity values become null, so no difference
        expect(result.stats.total).toBe(0);
      });

      it('should handle NaN and Infinity in arrays', () => {
        const a = { values: [1, NaN, Infinity] };
        const b = { values: [1, 2, 3] };
        const result = standardDiffDocCalculation({ a, b });

        // Arrays are compared using JSON.stringify, which converts NaN/Infinity to null
        // [1, NaN, Infinity] becomes [1, null, null]
        expect(result.stats.updates).toBe(1);
        expect(result.oldvalues.values).toEqual([1, NaN, Infinity]);
        expect(result.newvalues.values).toEqual([1, 2, 3]);
      });

      it('should throw TypeError for BigInt values like JSON.stringify', () => {
        const a = { value: BigInt(123) };
        const b = { value: BigInt(456) };

        // BigInt throws when serialised to JSON
        expect(() => standardDiffDocCalculation({ a, b })).toThrow(TypeError);
      });

      it('should throw TypeError for BigInt in nested objects', () => {
        const a = {
          config: { largeNumber: BigInt(9007199254740991) },
        };
        const b = {
          config: { largeNumber: BigInt(9007199254740992) },
        };

        expect(() => standardDiffDocCalculation({ a, b })).toThrow();
      });

      it('should throw TypeError for BigInt in arrays', () => {
        const a = { values: [1, 2, BigInt(3)] };
        const b = { values: [1, 2, BigInt(4)] };

        // JSON.stringify throws when encountering BigInt in arrays
        expect(() => standardDiffDocCalculation({ a, b })).toThrow(TypeError);
      });

      it('should ignore functions in objects (omitted in JSON)', () => {
        const a = { value: 'test', fn() {} };
        const b = { value: 'test' };
        const result = standardDiffDocCalculation({ a, b });

        // Functions are omitted during JSON serialization
        expect(result.stats.total).toEqual(0);
        expect(result.fieldChanges).toEqual([]);
      });

      it('should handle symbols in objects (omitted in JSON)', () => {
        const sym = Symbol('test');
        const a = { value: 'test', [sym]: 'symbol-value' };
        const b = { value: 'changed' };
        const result = standardDiffDocCalculation({ a, b });

        // Symbols are omitted during JSON serialization
        expect(result.stats.updates).toBe(1);
        expect(result.fieldChanges).toEqual(['value']);
      });

      it('should handle TypedArrays (same as JSON)', () => {
        const a = { data: new Uint8Array([1, 2, 3]) };
        const b = { data: new Uint8Array([1, 2, 4]) };
        const result = standardDiffDocCalculation({ a, b });

        expect(result.stats.updates).toBe(1);
        expect(result.fieldChanges).toEqual(['data']);
        expect(result.oldvalues.data).toEqual(new Uint8Array([1, 2, 3]));
        expect(result.newvalues.data).toEqual(new Uint8Array([1, 2, 4]));
      });

      it('should handle identical TypedArrays objects', () => {
        const a = { data: new Uint8Array([1, 2, 3]) };
        const b = { data: new Uint8Array([1, 2, 3]) };
        const result = standardDiffDocCalculation({ a, b });

        expect(result.fieldChanges).toEqual([]);
        expect(result.stats.total).toBe(0);
      });

      it('should handle TypedArrays with different lengths as an update', () => {
        const a = { data: new Uint8Array([]) };
        const b = { data: new Uint8Array([1, 2]) };
        const result = standardDiffDocCalculation({ a, b });

        expect(result.stats.updates).toBe(1);
        expect(result.fieldChanges).toEqual(['data']);
      });
    });
  });
});

// describe('#diffDocSource2', () => {
//   const a = {
//     changed1: 123456,
//     changed2: ['default'],
//     deleted3: '10.6.0',
//     ignored4: false,
//     ignored5: '2025-11-20T15:15:33.389Z',
//     nested6: {
//       nestedagain6: {
//         arrayinsidenested6: [
//           {
//             deepnestedinsidearray6: 'some value',
//           },
//         ],
//       },
//     },
//     ignored8: NaN, // excluded from JSON (= addition)
//     null9: null,
//   };

//   const filter = {
//     changed1: true,
//     changed2: true,
//     deleted3: true,
//     ignored4: false,
//     nested6: true,
//     added7: true,
//     invalid8: true,
//     null9: true,
//   } as SavedObjectsSnapshotFilter;

//   it('can handle an undefined "from" object A', () => {
//     // Setup
//     const b = structuredClone(a);
//     // Execute
//     const diff = diffDocSource(undefined, b);
//     // Assert
//     expect(diff.changedFields).toEqual(Object.keys(flatten.flatten(b, { safe: true })));
//     expect(diff.stats.additions).toEqual(8);
//   });

//   it('can handle an undefined "to" object B', () => {
//     // Setup
//     // Execute
//     const diff = diffDocSource(a, undefined);
//     // Assert
//     expect(diff.changedFields).toEqual(Object.keys(flatten.flatten(a, { safe: true })));
//     expect(diff.stats.deletions).toEqual(8);
//   });

//   it('returns a filtered diff of two JSON-equivalent objects', () => {
//     // Setup
//     const b = structuredClone(a);
//     b.changed1 = 654321;
//     b.changed2 = ['default', '2'];
//     delete b.deleted3;
//     b.ignored4 = undefined;
//     b.ignored5 = 'something else';
//     b.nested6.nestedagain6.arrayinsidenested6[0].deepnestedinsidearray6 = 'another value';
//     b.added7 = 'added property';
//     b.invalid8 = true;
//     b.null9 = undefined;

//     // Execute
//     const diff = diffDocSource(a, b, filter);

//     // Assert
//     expect(diff.stats.total).toEqual(7);
//     expect(diff).toEqual({
//       stats: { total: 7, additions: 2, deletions: 2, updates: 3 },
//       changedFields: [
//         'changed1',
//         'changed2',
//         'deleted3',
//         'nested6.nestedagain6.arrayinsidenested6',
//         'null9',
//         'added7',
//         'invalid8',
//       ],
//       oldValues: {
//         changed1: 123456,
//         changed2: ['default'],
//         deleted3: '10.6.0',
//         'nested6.nestedagain6.arrayinsidenested6': [
//           {
//             deepnestedinsidearray6: 'some value',
//           },
//         ],
//         null9: null,
//         added7: undefined,
//         invalid8: undefined, // <-- NaN cannot be translated to JSON
//       },
//       newValues: {
//         changed1: 654321,
//         changed2: ['default', '2'],
//         deleted3: undefined,
//         'nested6.nestedagain6.arrayinsidenested6': [
//           {
//             deepnestedinsidearray6: 'another value',
//           },
//         ],
//         null9: undefined,
//         added7: 'added property',
//         invalid8: true,
//       },
//     });
//   });
// });
