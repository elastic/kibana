/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256, hashFields } from './utils';

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
