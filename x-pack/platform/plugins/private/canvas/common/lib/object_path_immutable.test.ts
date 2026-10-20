/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * These test cases are adapted from the upstream `object-path-immutable` test
 * suite (MIT licensed, Copyright (c) 2015 Mario Casciaro), covering the subset
 * of functionality that Canvas vendors in `object_path_immutable.ts`
 * (`set`, `del`, `assign`, `push`, `insert`). They lock in the exact path
 * semantics, structural sharing and immutability guarantees of the original.
 */

import { set, del, assign, push, insert } from './object_path_immutable';

describe('object_path_immutable', () => {
  describe('set', () => {
    it('should set a deep key without modifying the original object', () => {
      const obj = { a: { b: 1 }, c: { d: 2 } };

      const newObj = set(obj, 'a.b', 3);

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(obj.a).toEqual({ b: 1 });
      // this should be the same
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a.b).toBe(3);
    });

    it('should set a deep array', () => {
      const obj = { a: { b: [1, 2, 3] }, c: { d: 2 } };

      const newObj = set(obj, 'a.b.1', 4);

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(newObj.a.b).not.toBe(obj.a.b);
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a.b).toEqual([1, 4, 3]);
    });

    it('should create intermediate objects and array', () => {
      const obj = { a: {}, c: { d: 2 } };

      const newObj: any = set(obj, 'a.b.1.f', 'a');

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(obj.a).toEqual({});
      expect(newObj.a).toEqual({ b: [undefined, { f: 'a' }] });
    });

    it('should return the input value if passed an empty path', () => {
      const obj = {};

      expect(set(obj, '', 'yo')).toBe('yo');
    });

    it('should set at a numeric path', () => {
      expect(set([], 0, 'yo')).toEqual(['yo']);
    });

    it('[security] should not override an object prototype', () => {
      set({}, '__proto__.injected', 'yo');
      expect(({} as Record<string, unknown>).injected).toBeUndefined();
    });

    it('[security] should not assign into an object prototype', () => {
      set({}, 'test', { __proto__: { injected: true } });
      expect(({} as Record<string, unknown>).injected).toBeUndefined();
    });
  });

  describe('insert', () => {
    it('should insert value into existing array without modifying the object', () => {
      const obj = { a: ['a'], c: {} };

      const newObj = insert(obj, 'a', 'b', 0);

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a).toEqual(['b', 'a']);
    });

    it('should create intermediary array', () => {
      const obj = { a: [], c: {} };

      const newObj: any = insert(obj, 'a.0.1', 'b');

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a).toEqual([[undefined, ['b']]]);
    });

    it('should insert in another index', () => {
      const obj = { a: 'b', b: { c: [], d: ['a', 'b'], e: [{}, { f: 'g' }], f: 'i' } };

      const newObj = insert(obj, 'b.d', 'asdf', 1);

      expect(newObj).not.toBe(obj);
      expect(newObj.b.d).toEqual(['a', 'asdf', 'b']);
    });

    it('should handle sparse array', () => {
      const obj: any = { a: 'b', b: { c: [], d: ['a', 'b'], e: [{}, { f: 'g' }], f: 'i' } };
      obj.b.d = new Array(4);
      obj.b.d[0] = 'a';
      obj.b.d[1] = 'b';

      const newObj: any = insert(obj, 'b.d', 'asdf', 3);
      expect(newObj).not.toBe(obj);
      expect(newObj.b.d[0]).toEqual('a');
      expect(newObj.b.d[1]).toEqual('b');
      expect(newObj.b.d[2]).toBeUndefined();
      expect(newObj.b.d[3]).toEqual('asdf');
      expect(newObj.b.d[4]).toBeUndefined();
      expect(newObj.b.d.length).toEqual(5);
    });

    it('should throw if asked to insert into something other than an array', () => {
      expect(() => {
        insert({ foo: 'bar' }, 'foo', 'baz');
      }).toThrow();
    });

    it('should return an array with an undefined value if passed an empty path and empty value and src is not an array', () => {
      const obj = {};

      expect(insert(obj, '')).toEqual([undefined]);
    });

    it('should insert the value in src if passed an empty path', () => {
      const obj = ['a', 'b', 'c'];

      expect(insert(obj, '', 'd', 1)).toEqual(['a', 'd', 'b', 'c']);
    });

    it('should insert at a numeric path', () => {
      expect(insert([[23, 42]], 0, 'yo', 1)).toEqual([[23, 'yo', 42]]);
    });
  });

  describe('push', () => {
    it('should push values without modifying the object', () => {
      const obj = { a: ['a'], c: {} };

      const newObj = push(obj, 'a', 'b');

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a).toEqual(['a', 'b']);
    });

    it('should create intermediate objects/arrays', () => {
      const obj = { a: [], c: {} };

      const newObj: any = push(obj, 'a.0.1', 'b');

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a).toEqual([[undefined, ['b']]]);
    });

    it('should push into the cloned original object if passed an empty path', () => {
      const obj = ['yoo'];

      expect(push(obj, '', 'yo')).toEqual(['yoo', 'yo']);
    });

    it('returns new array if passed an empty path and src is not an array', () => {
      const obj = {};

      expect(push(obj, '', 'yo')).toEqual(['yo']);
    });

    it('should push at a numeric path', () => {
      expect(push([[]], 0, 'yo')).toEqual([['yo']]);
    });
  });

  describe('del', () => {
    it('should delete deep values without modifying the object', () => {
      const obj = { a: { d: 1, f: 2 }, c: {} };

      const newObj = del(obj, 'a.d');

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a).toEqual({ f: 2 });
    });

    it('should delete deep values in array without modifying the object', () => {
      const obj = { a: ['a'], c: {} };

      const newObj = del(obj, 'a.0');

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a).toEqual([]);
    });

    it('should return undefined if passed an empty path', () => {
      const obj = {};

      expect(del(obj, '')).toBeUndefined();
    });

    it('should del at a numeric path', () => {
      expect(del([23, 'yo', 42], 1)).toEqual([23, 42]);
    });

    it('should delete falsy value', () => {
      expect(del(['', false], 1)).toEqual(['']);
    });
  });

  describe('assign', () => {
    it('should assign an object without modifying the original object', () => {
      const obj = { a: { b: 1 }, c: { d: 2 } };

      const newObj = assign(obj, 'a', { b: 3 });

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(obj.a).toEqual({ b: 1 });
      expect(newObj.c).toBe(obj.c);

      expect(newObj.a.b).toBe(3);
    });

    it('should keep existing fields that are not overwritten', () => {
      const obj = { a: { b: 1 } };

      const newObj: any = assign(obj, 'a', { c: 2 });

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(obj.a).toEqual({ b: 1 });
      expect(newObj.a).toEqual({ b: 1, c: 2 });
    });

    it('should create intermediate objects', () => {
      const obj = { a: {}, c: { d: 2 } };

      const newObj: any = assign(obj, 'a.b', { f: 'a' });

      expect(newObj).not.toBe(obj);
      expect(newObj.a).not.toBe(obj.a);
      expect(obj.a).toEqual({});
      expect(newObj.a).toEqual({ b: { f: 'a' } });
    });

    it('should return the original object if passed an empty path and an empty value to assign', () => {
      const obj = {};

      expect(assign(obj, '', {})).toBe(obj);
    });

    it('should assign at a numeric path', () => {
      expect(assign([{ foo: 'bar' }], 0, { foo: 'baz', fiz: 'biz' })).toEqual([
        { foo: 'baz', fiz: 'biz' },
      ]);
    });

    it('does not assign inherited properties', () => {
      const base = { fiz: 'biz' };
      const source: any = Object.create(base);
      source.frob = 'nard';

      const obj = { foo: {} };

      expect(assign(obj, 'foo', source)).toEqual({ foo: { frob: 'nard' } });
    });
  });
});
