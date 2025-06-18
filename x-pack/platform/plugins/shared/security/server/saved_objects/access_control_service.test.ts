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

  const getCurrentUser = jest.fn();
  const getTypeRegistry = jest.fn();
  const checkPrivilegesFunc = jest.fn();
  const mockTypeRegistry = {
    supportsAccessControl: jest.fn(),
  } as unknown as jest.Mocked<ISavedObjectTypeRegistry>;

  beforeEach(() => {
    jest.resetAllMocks();
    getCurrentUser.mockReturnValue(currentUser);
    getTypeRegistry.mockResolvedValue(mockTypeRegistry);
    mockTypeRegistry.supportsAccessControl.mockReturnValue(true);
    checkPrivilegesFunc.mockResolvedValue({ hasAllRequested: false });

    accessControlService = new AccessControlService({
      getCurrentUser,
      getTypeRegistry,
      checkPrivilegesFunc,
    });
  });

  describe('canModifyAccess', () => {
    it('returns true when type does not support access control', async () => {
      mockTypeRegistry.supportsAccessControl.mockReturnValue(false);

      const result = await accessControlService.canModifyAccess({
        type: 'dashboard',
        object: { type: 'dashboard', id: 'my-dashboard' },
      });

      expect(result).toBe(true);
      expect(mockTypeRegistry.supportsAccessControl).toHaveBeenCalledWith('dashboard');
    });

    it('returns true when object has no access control defined', async () => {
      const result = await accessControlService.canModifyAccess({
        type: 'dashboard',
        object: { type: 'dashboard', id: 'my-dashboard' },
      });

      expect(result).toBe(true);
    });

    it('returns true when there is no current user', async () => {
      getCurrentUser.mockReturnValue(null);

      const result = await accessControlService.canModifyAccess({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
      });

      expect(result).toBe(true);
    });

    it('returns true when the access mode is not read_only', async () => {
      const result = await accessControlService.canModifyAccess({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { owner: 'anotheruser' },
        },
      });

      expect(result).toBe(true);
    });

    it('returns true when the user is the owner', async () => {
      const result = await accessControlService.canModifyAccess({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'testuser' },
        },
      });

      expect(result).toBe(true);
    });

    it('returns true when the user has the required privilege', async () => {
      checkPrivilegesFunc.mockResolvedValue({ hasAllRequested: true });

      const result = await accessControlService.canModifyAccess({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
      });

      expect(result).toBe(true);
      expect(checkPrivilegesFunc).toHaveBeenCalledWith(
        'saved_object/dashboard:manageOwnership',
        []
      );
    });

    it('returns false when none of the conditions for modification are met', async () => {
      const result = await accessControlService.canModifyAccess({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
      });

      expect(result).toBe(false);
    });
  });
});
