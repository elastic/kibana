/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resolveJsonPointer,
  resolveDynamicString,
  resolveDynamicValue,
  resolveDataPath,
} from './data_model';

describe('resolveJsonPointer', () => {
  const dataModel = {
    user: {
      name: 'Alice',
      roles: ['admin', 'editor'],
      profile: {
        age: 30,
      },
    },
    items: [
      { id: 1, label: 'Item A' },
      { id: 2, label: 'Item B' },
    ],
    'key/with~special': 'escaped',
  };

  it('resolves a simple top-level key', () => {
    expect(resolveJsonPointer(dataModel, '/user')).toEqual(dataModel.user);
  });

  it('resolves nested object properties', () => {
    expect(resolveJsonPointer(dataModel, '/user/name')).toBe('Alice');
  });

  it('resolves deeply nested properties', () => {
    expect(resolveJsonPointer(dataModel, '/user/profile/age')).toBe(30);
  });

  it('resolves array elements by index', () => {
    expect(resolveJsonPointer(dataModel, '/items/0/label')).toBe('Item A');
    expect(resolveJsonPointer(dataModel, '/items/1/id')).toBe(2);
  });

  it('resolves array elements within nested objects', () => {
    expect(resolveJsonPointer(dataModel, '/user/roles/0')).toBe('admin');
    expect(resolveJsonPointer(dataModel, '/user/roles/1')).toBe('editor');
  });

  it('handles RFC 6901 escape sequences (~0 for ~ and ~1 for /)', () => {
    expect(resolveJsonPointer(dataModel, '/key~1with~0special')).toBe('escaped');
  });

  it('returns undefined for non-existent paths', () => {
    expect(resolveJsonPointer(dataModel, '/nonexistent')).toBeUndefined();
    expect(resolveJsonPointer(dataModel, '/user/missing')).toBeUndefined();
  });

  it('returns undefined for out-of-bounds array index', () => {
    expect(resolveJsonPointer(dataModel, '/items/99')).toBeUndefined();
  });

  it('returns undefined for non-pointer strings (no leading /)', () => {
    expect(resolveJsonPointer(dataModel, 'user/name')).toBeUndefined();
  });

  it('returns the root for empty segments after /', () => {
    expect(resolveJsonPointer({ '': 'root-key' }, '/')).toBe('root-key');
  });
});

describe('resolveDynamicValue', () => {
  const dataModel = { count: 42, label: 'hello', nested: { val: true } };

  it('returns literal string values directly', () => {
    expect(resolveDynamicValue('literal', dataModel)).toBe('literal');
  });

  it('returns literal number values directly', () => {
    expect(resolveDynamicValue(42, dataModel)).toBe(42);
  });

  it('resolves path bindings to string', () => {
    expect(resolveDynamicValue({ path: '/count' }, dataModel)).toBe('42');
    expect(resolveDynamicValue({ path: '/label' }, dataModel)).toBe('hello');
  });

  it('resolves nested object paths to JSON string', () => {
    expect(resolveDynamicValue({ path: '/nested' }, dataModel)).toBe('{"val":true}');
  });

  it('returns empty string for undefined/null resolved values', () => {
    expect(resolveDynamicValue({ path: '/missing' }, dataModel)).toBe('');
  });

  it('returns undefined for undefined input', () => {
    expect(resolveDynamicValue(undefined, dataModel)).toBeUndefined();
  });
});

describe('resolveDynamicString', () => {
  const dataModel = { greeting: 'Hi' };

  it('returns literal string', () => {
    expect(resolveDynamicString('hello', dataModel)).toBe('hello');
  });

  it('resolves path to string', () => {
    expect(resolveDynamicString({ path: '/greeting' }, dataModel)).toBe('Hi');
  });

  it('returns empty string for undefined input', () => {
    expect(resolveDynamicString(undefined, dataModel)).toBe('');
  });
});

describe('resolveDataPath', () => {
  const dataModel = {
    rows: [
      { name: 'A', value: 1 },
      { name: 'B', value: 2 },
    ],
    notAnArray: 'string',
  };

  it('resolves a path to an array of records', () => {
    expect(resolveDataPath('/rows', dataModel)).toEqual(dataModel.rows);
  });

  it('returns empty array for non-array values', () => {
    expect(resolveDataPath('/notAnArray', dataModel)).toEqual([]);
  });

  it('returns empty array for missing path', () => {
    expect(resolveDataPath('/missing', dataModel)).toEqual([]);
  });

  it('returns empty array for undefined path', () => {
    expect(resolveDataPath(undefined, dataModel)).toEqual([]);
  });
});
