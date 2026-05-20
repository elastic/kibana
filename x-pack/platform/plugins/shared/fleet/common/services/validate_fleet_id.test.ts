/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFleetSavedObjectId } from './validate_fleet_id';

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
  });
});
