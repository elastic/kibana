/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSelectedUsers } from './utils';

describe('toSelectedUsers', () => {
  describe('when value is an array', () => {
    it('returns valid SelectedUser elements', () => {
      expect(toSelectedUsers([{ uid: 'u1', name: 'Alice' }])).toEqual([
        { uid: 'u1', name: 'Alice' },
      ]);
    });

    it('filters out elements missing uid', () => {
      expect(toSelectedUsers([{ name: 'Alice' }])).toEqual([]);
    });

    it('filters out elements missing name', () => {
      expect(toSelectedUsers([{ uid: 'u1' }])).toEqual([]);
    });

    it('filters out elements where uid is not a string', () => {
      expect(toSelectedUsers([{ uid: 42, name: 'Alice' }])).toEqual([]);
    });

    it('filters out elements where name is not a string', () => {
      expect(toSelectedUsers([{ uid: 'u1', name: null }])).toEqual([]);
    });

    it('filters out primitive elements', () => {
      expect(toSelectedUsers([1, 'foo', true, null])).toEqual([]);
    });

    it('filters out plain objects with unrelated keys', () => {
      expect(toSelectedUsers([{ foo: 'bar' }])).toEqual([]);
    });

    it('keeps valid entries and drops invalid ones in a mixed array', () => {
      expect(
        toSelectedUsers([
          { uid: 'u1', name: 'Alice' },
          { foo: 'bar' },
          { uid: 'u2', name: 'Bob' },
          42,
        ])
      ).toEqual([
        { uid: 'u1', name: 'Alice' },
        { uid: 'u2', name: 'Bob' },
      ]);
    });

    it('returns an empty array for an empty array input', () => {
      expect(toSelectedUsers([])).toEqual([]);
    });
  });

  describe('when value is a JSON string', () => {
    it('parses and returns valid SelectedUser elements', () => {
      expect(toSelectedUsers(JSON.stringify([{ uid: 'u1', name: 'Alice' }]))).toEqual([
        { uid: 'u1', name: 'Alice' },
      ]);
    });

    it('filters out invalid elements from a parsed array', () => {
      expect(
        toSelectedUsers(JSON.stringify([{ foo: 'bar' }, { uid: 'u1', name: 'Alice' }]))
      ).toEqual([{ uid: 'u1', name: 'Alice' }]);
    });

    it('returns an empty array when the parsed value is not an array', () => {
      expect(toSelectedUsers(JSON.stringify({ uid: 'u1', name: 'Alice' }))).toEqual([]);
    });

    it('returns an empty array for invalid JSON', () => {
      expect(toSelectedUsers('not-json')).toEqual([]);
    });

    it('returns an empty array for an empty string', () => {
      expect(toSelectedUsers('')).toEqual([]);
    });
  });

  describe('when value is neither an array nor a string', () => {
    it('returns an empty array for null', () => {
      expect(toSelectedUsers(null)).toEqual([]);
    });

    it('returns an empty array for undefined', () => {
      expect(toSelectedUsers(undefined)).toEqual([]);
    });

    it('returns an empty array for a number', () => {
      expect(toSelectedUsers(42)).toEqual([]);
    });

    it('returns an empty array for a plain object', () => {
      expect(toSelectedUsers({ uid: 'u1', name: 'Alice' })).toEqual([]);
    });
  });
});
