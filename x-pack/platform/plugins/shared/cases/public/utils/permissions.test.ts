/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noCasesPermissions, readCasesPermissions } from '../common/mock';
import { getAllPermissionsExceptFrom, isReadOnlyPermissions } from './permissions';

describe('permissions', () => {
  describe('isReadOnlyPermissions', () => {
    const tests = [
      ['update'],
      ['create'],
      ['delete'],
      ['push'],
      ['all'],
      ['assign'],
      ['createComment'],
    ];

    it('returns true if the user has only read permissions', async () => {
      expect(isReadOnlyPermissions(readCasesPermissions())).toBe(true);
    });

    it('returns true if the user has not read permissions', async () => {
      expect(isReadOnlyPermissions(noCasesPermissions())).toBe(false);
    });

    it.each(tests)(
      'returns false if the user has permission %s=true and read=true',
      async (permission) => {
        const noPermissions = noCasesPermissions();
        expect(isReadOnlyPermissions({ ...noPermissions, [permission]: true })).toBe(false);
      }
    );
  });

  describe('getAllPermissionsExceptFrom', () => {
    it('returns the correct permissions', async () => {
      expect(getAllPermissionsExceptFrom('create')).toEqual([
        'read',
        'update',
        'delete',
        'push',
        'assign',
      ]);
    });
  });
});
