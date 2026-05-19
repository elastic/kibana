/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFleetSavedObjectId } from './validate_fleet_id';

describe('validateFleetSavedObjectId', () => {
  describe('accepts (returns undefined)', () => {
    it('undefined value', () => {
      expect(validateFleetSavedObjectId(undefined)).toBeUndefined();
    });

    it('lowercase UUID', () => {
      expect(validateFleetSavedObjectId('550e8400-e29b-41d4-a716-446655440000')).toBeUndefined();
    });

    it('uppercase UUID', () => {
      expect(validateFleetSavedObjectId('550E8400-E29B-41D4-A716-446655440000')).toBeUndefined();
    });

    it('simple slug', () => {
      expect(validateFleetSavedObjectId('my-policy-1')).toBeUndefined();
    });

    it('slug with dots', () => {
      expect(validateFleetSavedObjectId('policy.with.dots')).toBeUndefined();
    });

    it('id with underscores', () => {
      expect(validateFleetSavedObjectId('fleet_server_policy')).toBeUndefined();
    });

    it('id with spaces', () => {
      expect(validateFleetSavedObjectId('my policy name')).toBeUndefined();
    });

    it('id with colon (KQL-special but handled at escape layer)', () => {
      expect(validateFleetSavedObjectId('ns:policy-1')).toBeUndefined();
    });

    it('id with asterisk (KQL-special but handled at escape layer)', () => {
      expect(validateFleetSavedObjectId('policy*1')).toBeUndefined();
    });

    it('255-character id', () => {
      expect(validateFleetSavedObjectId('a'.repeat(255))).toBeUndefined();
    });
  });

  describe('rejects (returns error string)', () => {
    it('empty string', () => {
      expect(validateFleetSavedObjectId('')).toBeDefined();
    });

    it('single dot-dot traversal', () => {
      expect(validateFleetSavedObjectId('..')).toBeDefined();
    });

    it('path traversal prefix', () => {
      expect(validateFleetSavedObjectId('../../etc/passwd')).toBeDefined();
    });

    it('forward slash in id', () => {
      expect(validateFleetSavedObjectId('a/b')).toBeDefined();
    });

    it('id starting with slash', () => {
      expect(validateFleetSavedObjectId('/etc/passwd')).toBeDefined();
    });

    it('__proto__ key', () => {
      expect(validateFleetSavedObjectId('__proto__')).toBeDefined();
    });

    it('constructor key', () => {
      expect(validateFleetSavedObjectId('constructor')).toBeDefined();
    });

    it('prototype key', () => {
      expect(validateFleetSavedObjectId('prototype')).toBeDefined();
    });

    it('256-character id (over limit)', () => {
      expect(validateFleetSavedObjectId('a'.repeat(256))).toBeDefined();
    });
  });
});
