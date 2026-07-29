/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeJsonPatch, dotPathToJsonPointer } from './diff';
import type { ExtendedJsonPatch } from './types';

const opAt = (patch: ExtendedJsonPatch, path: string) => patch.ops.find((op) => op.path === path);
const noOpPaths = (patch: ExtendedJsonPatch) => patch.noOps.map((noOp) => noOp.path);

// ---------------------------------------------------------------------------
// dotPathToJsonPointer
// ---------------------------------------------------------------------------

describe('dotPathToJsonPointer', () => {
  it('converts a simple key to a JSON Pointer', () => {
    expect(dotPathToJsonPointer('name')).toBe('/name');
  });

  it('converts a dot-path to a JSON Pointer', () => {
    expect(dotPathToJsonPointer('user.email')).toBe('/user/email');
  });

  it('converts a deeply nested dot-path', () => {
    expect(dotPathToJsonPointer('a.b.c.d')).toBe('/a/b/c/d');
  });

  it('escapes ~ as ~0', () => {
    expect(dotPathToJsonPointer('a~b')).toBe('/a~0b');
  });

  it('escapes / as ~1', () => {
    expect(dotPathToJsonPointer('a/b')).toBe('/a~1b');
  });

  it('escapes ~ before / to avoid double-processing', () => {
    expect(dotPathToJsonPointer('a~/b')).toBe('/a~0~1b');
  });
});

// ---------------------------------------------------------------------------
// computeJsonPatch
// ---------------------------------------------------------------------------

describe('computeJsonPatch', () => {
  it('returns the correct format discriminator', () => {
    expect(computeJsonPatch({ a: {}, b: {} }).format).toBe('json_patch_extended');
  });

  describe('no changes', () => {
    it('emits empty ops and all keys as noOps when objects are identical', () => {
      const patch = computeJsonPatch({
        a: { name: 'foo', count: 3 },
        b: { name: 'foo', count: 3 },
      });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch).sort()).toEqual(['/count', '/name']);
    });

    it('emits empty ops and noOps for two empty objects', () => {
      const patch = computeJsonPatch({ a: {}, b: {} });

      expect(patch.ops).toEqual([]);
      expect(patch.noOps).toEqual([]);
    });
  });

  describe('add operations', () => {
    it('emits an add op (value only) for a field present in b but not a', () => {
      const patch = computeJsonPatch({ a: { existing: 1 }, b: { existing: 1, newField: 'hello' } });

      expect(opAt(patch, '/newField')).toEqual({ op: 'add', path: '/newField', value: 'hello' });
      expect(opAt(patch, '/newField')).not.toHaveProperty('oldValue');
      expect(noOpPaths(patch)).toContain('/existing');
    });

    it('emits an add op for a nested field under an existing parent', () => {
      const patch = computeJsonPatch({
        a: { config: { timeout: 30 } },
        b: { config: { timeout: 30, retries: 3 } },
      });

      expect(opAt(patch, '/config/retries')).toEqual({
        op: 'add',
        path: '/config/retries',
        value: 3,
      });
      expect(noOpPaths(patch)).toContain('/config/timeout');
    });
  });

  describe('remove operations', () => {
    it('emits a remove op (oldValue only) for a field present in a but not b', () => {
      const patch = computeJsonPatch({ a: { existing: 1, removed: 'bye' }, b: { existing: 1 } });

      expect(opAt(patch, '/removed')).toEqual({ op: 'remove', path: '/removed', oldValue: 'bye' });
      expect(opAt(patch, '/removed')).not.toHaveProperty('value');
    });

    it('emits a remove op for a nested field removed from an existing parent', () => {
      const patch = computeJsonPatch({
        a: { config: { timeout: 30, legacy: true } },
        b: { config: { timeout: 30 } },
      });

      expect(opAt(patch, '/config/legacy')).toEqual({
        op: 'remove',
        path: '/config/legacy',
        oldValue: true,
      });
    });
  });

  describe('replace operations', () => {
    it('emits a replace op with both value and oldValue for a changed field', () => {
      const patch = computeJsonPatch({ a: { output: 'default' }, b: { output: 'logstash-prod' } });

      expect(opAt(patch, '/output')).toEqual({
        op: 'replace',
        path: '/output',
        value: 'logstash-prod',
        oldValue: 'default',
      });
    });

    it('detects changed number and boolean values', () => {
      const patch = computeJsonPatch({
        a: { timeout: 30, on: false },
        b: { timeout: 60, on: true },
      });

      expect(opAt(patch, '/timeout')).toMatchObject({ value: 60, oldValue: 30 });
      expect(opAt(patch, '/on')).toMatchObject({ value: true, oldValue: false });
    });

    it('detects a change deep in a nested structure', () => {
      const patch = computeJsonPatch({
        a: { config: { auth: { method: 'basic' } } },
        b: { config: { auth: { method: 'token' } } },
      });

      expect(opAt(patch, '/config/auth/method')).toMatchObject({
        value: 'token',
        oldValue: 'basic',
      });
    });

    it('emits replace ops for multiple changed fields', () => {
      const patch = computeJsonPatch({
        a: { x: 1, y: 'a', z: true },
        b: { x: 2, y: 'b', z: false },
      });

      expect(patch.ops).toHaveLength(3);
      expect(patch.ops.every((op) => op.op === 'replace')).toBe(true);
    });
  });

  describe('array handling', () => {
    it('treats unchanged arrays as equal (noOp, no op)', () => {
      const patch = computeJsonPatch({
        a: { tags: ['a', 'b', 'c'] },
        b: { tags: ['a', 'b', 'c'] },
      });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch)).toContain('/tags');
    });

    it('detects arrays with different content as changed', () => {
      const patch = computeJsonPatch({ a: { tags: ['a', 'b'] }, b: { tags: ['a', 'b', 'c'] } });

      expect(opAt(patch, '/tags')).toMatchObject({
        value: ['a', 'b', 'c'],
        oldValue: ['a', 'b'],
      });
    });

    it('detects arrays with the same elements in a different order as changed', () => {
      const patch = computeJsonPatch({ a: { tags: ['a', 'b'] }, b: { tags: ['b', 'a'] } });

      expect(opAt(patch, '/tags')).toBeDefined();
    });

    it('treats an array replaced by a non-array as changed', () => {
      const patch = computeJsonPatch({ a: { value: [1, 2, 3] }, b: { value: 'flat' } });

      expect(opAt(patch, '/value')).toMatchObject({ value: 'flat', oldValue: [1, 2, 3] });
    });
  });

  describe('fieldsToIgnore', () => {
    it('excludes exact-match top-level fields from ops and noOps', () => {
      const patch = computeJsonPatch({
        a: { name: 'old', updated_at: '2024-01-01' },
        b: { name: 'new', updated_at: '2024-01-02' },
        fieldsToIgnore: ['updated_at'],
      });

      expect(opAt(patch, '/updated_at')).toBeUndefined();
      expect(noOpPaths(patch)).not.toContain('/updated_at');
      expect(opAt(patch, '/name')).toBeDefined();
    });

    it('excludes nested fields that are children of an ignored prefix', () => {
      const patch = computeJsonPatch({
        a: { meta: { version: 1, hash: 'abc' } },
        b: { meta: { version: 2, hash: 'xyz' } },
        fieldsToIgnore: ['meta'],
      });

      expect(patch.ops).toEqual([]);
      expect(patch.noOps).toEqual([]);
    });

    it('keeps an unchanged, non-ignored field in noOps', () => {
      const patch = computeJsonPatch({
        a: { name: 'same', version: 1 },
        b: { name: 'same', version: 2 },
        fieldsToIgnore: ['version'],
      });

      expect(noOpPaths(patch)).toEqual(['/name']);
      expect(opAt(patch, '/version')).toBeUndefined();
    });

    it('ignores all RFC-proposed system fields correctly', () => {
      const systemFields = [
        'updated_at',
        'updated_by',
        'created_at',
        'created_by',
        'typeMigrationVersion',
        'coreMigrationVersion',
        'migrationVersion',
        'version',
        'managed',
        'accessControl',
        'missingReferences',
      ];
      const makeObj = (val: number) => Object.fromEntries(systemFields.map((f) => [f, val]));

      const patch = computeJsonPatch({
        a: makeObj(1),
        b: makeObj(2),
        fieldsToIgnore: systemFields,
      });

      expect(patch.ops).toEqual([]);
      expect(patch.noOps).toEqual([]);
    });
  });

  describe('fieldsToRedact (sensitive field redaction)', () => {
    it('replaces value and oldValue with the redacted sentinel for a changed field', () => {
      const patch = computeJsonPatch({
        a: { apiKey: 'old-secret', name: 'agent' },
        b: { apiKey: 'new-secret', name: 'agent' },
        fieldsToRedact: ['apiKey'],
      });

      expect(opAt(patch, '/apiKey')).toEqual({
        op: 'replace',
        path: '/apiKey',
        value: '[redacted]',
        oldValue: '[redacted]',
      });
    });

    it('still detects the field as changed (does not suppress the op)', () => {
      const patch = computeJsonPatch({
        a: { secret: 'old' },
        b: { secret: 'new' },
        fieldsToRedact: ['secret'],
      });

      expect(opAt(patch, '/secret')).toBeDefined();
    });

    it('does not emit an op for an unchanged redacted field', () => {
      const patch = computeJsonPatch({
        a: { secret: 'same' },
        b: { secret: 'same' },
        fieldsToRedact: ['secret'],
      });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch)).toContain('/secret');
    });

    it('redacts children of a redacted field prefix', () => {
      const patch = computeJsonPatch({
        a: { credentials: { user: 'alice', password: 'p1' } },
        b: { credentials: { user: 'alice', password: 'p2' } },
        fieldsToRedact: ['credentials'],
      });

      expect(opAt(patch, '/credentials/password')).toEqual({
        op: 'replace',
        path: '/credentials/password',
        value: '[redacted]',
        oldValue: '[redacted]',
      });
      expect(noOpPaths(patch)).toContain('/credentials/user');
    });

    it('does not redact fields outside the fieldsToRedact list', () => {
      const patch = computeJsonPatch({
        a: { secret: 'old', name: 'foo' },
        b: { secret: 'new', name: 'bar' },
        fieldsToRedact: ['secret'],
      });

      expect(opAt(patch, '/name')).toMatchObject({ value: 'bar', oldValue: 'foo' });
    });

    it('redacts an added redacted field (value only)', () => {
      const patch = computeJsonPatch({
        a: { name: 'agent' },
        b: { name: 'agent', apiKey: 'new-secret' },
        fieldsToRedact: ['apiKey'],
      });

      expect(opAt(patch, '/apiKey')).toEqual({ op: 'add', path: '/apiKey', value: '[redacted]' });
    });

    it('redacts a removed redacted field (oldValue only)', () => {
      const patch = computeJsonPatch({
        a: { name: 'agent', apiKey: 'old-secret' },
        b: { name: 'agent' },
        fieldsToRedact: ['apiKey'],
      });

      expect(opAt(patch, '/apiKey')).toEqual({
        op: 'remove',
        path: '/apiKey',
        oldValue: '[redacted]',
      });
    });
  });

  describe('fieldSizeLimit', () => {
    it('passes through values below the limit unchanged', () => {
      const patch = computeJsonPatch({
        a: { name: 'old' },
        b: { name: 'new' },
        fieldSizeLimit: 1024,
      });

      expect(opAt(patch, '/name')).toMatchObject({ value: 'new', oldValue: 'old' });
    });

    it('replaces a value exceeding the limit with the sentinel', () => {
      const patch = computeJsonPatch({
        a: { data: 'small' },
        b: { data: 'x'.repeat(200) },
        fieldSizeLimit: 100,
      });

      expect(opAt(patch, '/data')).toMatchObject({
        value: 'Value above fieldSizeLimit',
        oldValue: 'small',
      });
    });

    it('replaces oldValue too if it exceeds the limit', () => {
      const patch = computeJsonPatch({
        a: { data: 'y'.repeat(200) },
        b: { data: 'small' },
        fieldSizeLimit: 100,
      });

      expect(opAt(patch, '/data')).toMatchObject({
        value: 'small',
        oldValue: 'Value above fieldSizeLimit',
      });
    });

    it('replaces an added value if it exceeds the limit', () => {
      const patch = computeJsonPatch({ a: {}, b: { data: 'z'.repeat(200) }, fieldSizeLimit: 100 });

      expect(opAt(patch, '/data')).toEqual({
        op: 'add',
        path: '/data',
        value: 'Value above fieldSizeLimit',
      });
    });

    it('replaces a removed oldValue if it exceeds the limit', () => {
      const patch = computeJsonPatch({ a: { data: 'z'.repeat(200) }, b: {}, fieldSizeLimit: 100 });

      expect(opAt(patch, '/data')).toEqual({
        op: 'remove',
        path: '/data',
        oldValue: 'Value above fieldSizeLimit',
      });
    });

    it('applies no limit when fieldSizeLimit is not provided', () => {
      const bigValue = 'x'.repeat(200_000);
      const patch = computeJsonPatch({ a: { data: 'small' }, b: { data: bigValue } });

      expect(opAt(patch, '/data')).toMatchObject({ value: bigValue });
    });

    it('redaction takes precedence over the size limit', () => {
      const patch = computeJsonPatch({
        a: { secret: 'small' },
        b: { secret: 'x'.repeat(200) },
        fieldsToRedact: ['secret'],
        fieldSizeLimit: 100,
      });

      expect(opAt(patch, '/secret')).toMatchObject({ value: '[redacted]', oldValue: '[redacted]' });
    });
  });

  describe('JSON Pointer path encoding', () => {
    it('encodes a key containing ~ as ~0', () => {
      const patch = computeJsonPatch({ a: { 'a~b': 1 }, b: { 'a~b': 2 } });
      expect(patch.ops[0].path).toBe('/a~0b');
    });

    it('encodes a key containing / as ~1', () => {
      const patch = computeJsonPatch({ a: { 'a/b': 1 }, b: { 'a/b': 2 } });
      expect(patch.ops[0].path).toBe('/a~1b');
    });
  });

  describe('RFC example from the design doc', () => {
    it('produces the expected patch for the agent policy example', () => {
      const patch = computeJsonPatch({
        a: { data_output_id: 'default', legacy_mode: true },
        b: { data_output_id: 'logstash-prod', monitoring_enabled: ['logs', 'metrics'] },
      });

      expect(opAt(patch, '/data_output_id')).toMatchObject({
        op: 'replace',
        value: 'logstash-prod',
        oldValue: 'default',
      });
      expect(opAt(patch, '/monitoring_enabled')).toMatchObject({
        op: 'add',
        value: ['logs', 'metrics'],
      });
      expect(opAt(patch, '/legacy_mode')).toMatchObject({ op: 'remove', oldValue: true });
    });
  });
});
