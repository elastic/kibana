/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

import { AccessControlService } from './access_control_service';

describe('AccessControlService', () => {
  let accessControlService: AccessControlService;
  const currentUser = {
    username: 'testuser',
    roles: ['kibana_admin'],
    authentication_type: 'basic',
    authentication_realm: { name: 'basic', type: 'basic' },
    enabled: true,
  } as unknown as AuthenticatedUser;

  const getTypeRegistry = jest.fn();
  const checkPrivilegesFunc = jest.fn();
  const mockTypeRegistry = {
    supportsAccessControl: jest.fn(),
  } as unknown as jest.Mocked<ISavedObjectTypeRegistry>;

  beforeEach(() => {
    jest.resetAllMocks();
    getTypeRegistry.mockResolvedValue(mockTypeRegistry);
    mockTypeRegistry.supportsAccessControl.mockReturnValue(true);
    checkPrivilegesFunc.mockResolvedValue({ hasAllRequested: false });

    accessControlService = new AccessControlService({
      getTypeRegistry,
      checkPrivilegesFunc,
    });
  });

  describe('setUserForOperation', () => {
    it('should set the user for operation', () => {
      accessControlService.setUserForOperation(currentUser);

      // Test the user was properly set by calling canModifyObject
      // which uses userForOperation internally
      const testObject = {
        type: 'dashboard',
        id: 'my-dashboard',
        accessControl: { accessMode: 'read_only' as const, owner: 'testuser' },
      };

      return accessControlService
        .canModifyObject({
          type: 'dashboard',
          object: testObject,
          spacesToAuthorize: new Set(),
        })
        .then((result) => {
          // Since the user is the owner, it should return true
          expect(result).toBe(true);
        });
    });

    it('should set null user for operation', () => {
      accessControlService.setUserForOperation(null);

      // Test the null user was properly set
      return accessControlService
        .canModifyObject({
          type: 'dashboard',
          object: {
            type: 'dashboard',
            id: 'my-dashboard',
            accessControl: { accessMode: 'read_only' as const, owner: 'anotheruser' },
          },
          spacesToAuthorize: new Set(),
        })
        .then((result) => {
          expect(result).toBe(false);
        });
    });
  });

  describe('canModifyObject', () => {
    beforeEach(() => {
      // Set the user for all tests in this block
      accessControlService.setUserForOperation(currentUser);
    });
    it('returns true when type does not support access control', async () => {
      mockTypeRegistry.supportsAccessControl.mockReturnValue(false);

      const result = await accessControlService.canModifyObject({
        type: 'dashboard',
        object: { type: 'dashboard', id: 'my-dashboard' },
        spacesToAuthorize: new Set(),
      });

      expect(result).toBe(true);
      expect(mockTypeRegistry.supportsAccessControl).toHaveBeenCalledWith('dashboard');
    });

    it('returns true when object has no access control defined', async () => {
      const result = await accessControlService.canModifyObject({
        type: 'dashboard',
        object: { type: 'dashboard', id: 'my-dashboard' },
        spacesToAuthorize: new Set(),
      });

      expect(result).toBe(true);
    });

    it('returns true when there is no current user', async () => {
      accessControlService.setUserForOperation(null);

      const result = await accessControlService.canModifyObject({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
        spacesToAuthorize: new Set(),
      });

      expect(result).toBe(false);
    });

    it('returns true when the access mode is not read_only', async () => {
      const result = await accessControlService.canModifyObject({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { owner: 'anotheruser' },
        },
        spacesToAuthorize: new Set(),
      });

      expect(result).toBe(true);
    });

    it('returns true when the user is the owner', async () => {
      const result = await accessControlService.canModifyObject({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'testuser' },
        },
        spacesToAuthorize: new Set(),
      });

      expect(result).toBe(true);
    });

    it('returns true when the user has the required privilege in a single space', async () => {
      checkPrivilegesFunc.mockResolvedValue({ hasAllRequested: true });
      const spacesToAuthorize = new Set(['space1']);

      const result = await accessControlService.canModifyObject({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
        spacesToAuthorize,
      });

      expect(result).toBe(true);
      expect(checkPrivilegesFunc).toHaveBeenCalledWith('saved_object/dashboard:manageOwnership', [
        'space1',
      ]);
    });

    it('returns true when the user has the required privilege in multiple spaces', async () => {
      checkPrivilegesFunc.mockResolvedValue({ hasAllRequested: true });
      const spacesToAuthorize = new Set(['space1', 'space2', 'space3']);

      const result = await accessControlService.canModifyObject({
        type: 'visualization',
        object: {
          type: 'visualization',
          id: 'my-viz',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
        spacesToAuthorize,
      });

      expect(result).toBe(true);
      expect(checkPrivilegesFunc).toHaveBeenCalledWith(
        'saved_object/visualization:manageOwnership',
        expect.arrayContaining(['space1', 'space2', 'space3'])
      );
      // Verify the array has exactly 3 elements
      expect(checkPrivilegesFunc.mock.calls[0][1]).toHaveLength(3);
    });

    it('correctly constructs the privilege string based on object type', async () => {
      checkPrivilegesFunc.mockResolvedValue({ hasAllRequested: true });
      const spacesToAuthorize = new Set(['space1']);

      await accessControlService.canModifyObject({
        type: 'lens',
        object: {
          type: 'lens',
          id: 'my-lens',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
        spacesToAuthorize,
      });

      expect(checkPrivilegesFunc).toHaveBeenCalledWith('saved_object/lens:manageOwnership', [
        'space1',
      ]);
    });

    it('returns false when none of the conditions for modification are met', async () => {
      const spacesToAuthorize = new Set(['space1']);

      const result = await accessControlService.canModifyObject({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
        spacesToAuthorize,
      });

      expect(result).toBe(false);
      expect(checkPrivilegesFunc).toHaveBeenCalledWith('saved_object/dashboard:manageOwnership', [
        'space1',
      ]);
    });
  });
});
