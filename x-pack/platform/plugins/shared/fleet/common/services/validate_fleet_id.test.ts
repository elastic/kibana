/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateFleetSavedObjectId,
  isPathTraversalId,
  validateNoPathTraversalId,
  validateNoPathTraversalIdSchema,
} from './validate_fleet_id';

describe('validateFleetSavedObjectId', () => {
  describe('accepts (does not throw)', () => {
    it('undefined value', () => {
      expect(() => validateFleetSavedObjectId(undefined)).not.toThrow();
    });

    it('lowercase UUID', () => {
      expect(() =>
        validateFleetSavedObjectId('550e8400-e29b-41d4-a716-446655440000')
      ).not.toThrow();
    });

    it('uppercase UUID', () => {
      expect(() =>
        validateFleetSavedObjectId('550E8400-E29B-41D4-A716-446655440000')
      ).not.toThrow();
    });

    it('simple slug', () => {
      expect(() => validateFleetSavedObjectId('my-policy-1')).not.toThrow();
    });

    it('slug with dots', () => {
      expect(() => validateFleetSavedObjectId('policy.with.dots')).not.toThrow();
    });

    it('id with underscores', () => {
      expect(() => validateFleetSavedObjectId('fleet_server_policy')).not.toThrow();
    });

    it('id with spaces', () => {
      expect(() => validateFleetSavedObjectId('my policy name')).not.toThrow();
    });

    it('id with colon (KQL-special but handled at escape layer)', () => {
      expect(() => validateFleetSavedObjectId('ns:policy-1')).not.toThrow();
    });

    it('id with asterisk (KQL-special but handled at escape layer)', () => {
      expect(() => validateFleetSavedObjectId('policy*1')).not.toThrow();
    });

    it('255-character id', () => {
      expect(() => validateFleetSavedObjectId('a'.repeat(255))).not.toThrow();
    });
  });

  describe('rejects (throws FleetError)', () => {
    it('empty string', () => {
      expect(() => validateFleetSavedObjectId('')).toThrow('id is not valid');
    });

    it('single dot-dot traversal', () => {
      expect(() => validateFleetSavedObjectId('..')).toThrow('id is not valid');
    });

    it('path traversal prefix', () => {
      expect(() => validateFleetSavedObjectId('../../etc/passwd')).toThrow('id is not valid');
    });

    it('forward slash in id', () => {
      expect(() => validateFleetSavedObjectId('a/b')).toThrow('id is not valid');
    });

    it('id starting with slash', () => {
      expect(() => validateFleetSavedObjectId('/etc/passwd')).toThrow('id is not valid');
    });

    it('__proto__ key', () => {
      expect(() => validateFleetSavedObjectId('__proto__')).toThrow('id is not valid');
    });

    it('constructor key', () => {
      expect(() => validateFleetSavedObjectId('constructor')).toThrow('id is not valid');
    });

    it('prototype key', () => {
      expect(() => validateFleetSavedObjectId('prototype')).toThrow('id is not valid');
    });

    it('256-character id (over limit)', () => {
      expect(() => validateFleetSavedObjectId('a'.repeat(256))).toThrow('id is not valid');
    });

    // Script metacharacters — no legitimate use in Fleet saved object IDs.
    it('double quote (Painless string break)', () => {
      expect(() => validateFleetSavedObjectId('x"); ctx._source.pwned=("true')).toThrow(
        'id is not valid'
      );
    });

    it('single quote (Painless string break in renderUpdatePainlessScript)', () => {
      expect(() => validateFleetSavedObjectId("x'); ctx._source.pwned=('true")).toThrow(
        'id is not valid'
      );
    });

    it('semicolon (Painless statement separator)', () => {
      expect(() => validateFleetSavedObjectId('x;ctx._source.pwned=true')).toThrow(
        'id is not valid'
      );
    });

    it('backslash (Painless escape character)', () => {
      expect(() => validateFleetSavedObjectId('x\\"')).toThrow('id is not valid');
    });

    it('open parenthesis', () => {
      expect(() => validateFleetSavedObjectId('x(y')).toThrow('id is not valid');
    });

    it('close parenthesis', () => {
      expect(() => validateFleetSavedObjectId('x)y')).toThrow('id is not valid');
    });
  });
});

describe('isPathTraversalId / validateNoPathTraversalId', () => {
  // Input and stream ids embed the input type, so `/` is legal — only `..`
  // segments (and NUL) escape a parent directory.
  const safeIds = [
    'cloudbeat/cis_k8s-kspm-550e8400-e29b-41d4-a716-446655440000',
    'logfile-system.syslog-550e8400',
    'foo..bar', // ".." as a substring, not a whole segment
    'a..b/c..d',
    'cloudbeat/cis_k8s',
    'my-input-id',
    'a/b/c',
    'policy.with.dots',
  ];

  const traversalIds = [
    '..',
    '../x',
    'a/../b',
    'a/..',
    '../../../../tmp/report-proof',
    'a\\..\\b', // Windows separator
    '..\\x',
    '\\..',
    'a\0b', // NUL character
  ];

  describe('isPathTraversalId', () => {
    it.each(safeIds)('returns false for safe id %p', (id) => {
      expect(isPathTraversalId(id)).toBe(false);
    });

    it.each(traversalIds)('returns true for traversal id %p', (id) => {
      expect(isPathTraversalId(id)).toBe(true);
    });
  });

  describe('validateNoPathTraversalId', () => {
    it('does not throw for undefined', () => {
      expect(() => validateNoPathTraversalId(undefined)).not.toThrow();
    });

    it('does not throw for null (treated as no id set)', () => {
      expect(() => validateNoPathTraversalId(null)).not.toThrow();
    });

    it.each(safeIds)('does not throw for safe id %p', (id) => {
      expect(() => validateNoPathTraversalId(id)).not.toThrow();
    });

    it.each(traversalIds)('throws for traversal id %p', (id) => {
      expect(() => validateNoPathTraversalId(id)).toThrow('path traversal');
    });

    // Some id sources are schema-typed as `any`; a non-string (other than
    // null/undefined) must be rejected, not crash the string check.
    it.each([42, true, {}, [], { value: 'x' }])(
      'throws for non-string value %p instead of crashing',
      (value) => {
        expect(() => validateNoPathTraversalId(value)).toThrow('path traversal');
      }
    );
  });

  describe('validateNoPathTraversalIdSchema', () => {
    it.each(safeIds)('returns undefined for safe id %p', (id) => {
      expect(validateNoPathTraversalIdSchema(id)).toBeUndefined();
    });

    it.each(traversalIds)('returns an error message for traversal id %p', (id) => {
      expect(validateNoPathTraversalIdSchema(id)).toMatch(/path traversal/);
    });
  });
});
