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
  const mockTypeRegistry = {
    supportsAccessControl: jest.fn(),
  } as unknown as jest.Mocked<ISavedObjectTypeRegistry>;

  beforeEach(() => {
    jest.resetAllMocks();
    getTypeRegistry.mockResolvedValue(mockTypeRegistry);
    mockTypeRegistry.supportsAccessControl.mockReturnValue(true);

    accessControlService = new AccessControlService();
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

      const result = accessControlService.canModifyObject({
        type: 'dashboard',
        object: testObject,
      });
      expect(result).toBe(true);
    });

    it('should set null user for operation', () => {
      accessControlService.setUserForOperation(null);

      // Test the null user was properly set
      expect(
        accessControlService.canModifyObject({
          type: 'dashboard',
          object: {
            type: 'dashboard',
            id: 'my-dashboard',
            accessControl: { accessMode: 'read_only' as const, owner: 'anotheruser' },
          },
        })
      ).toBe(true);
    });
  });

  describe('canModifyObject', () => {
    beforeEach(() => {
      accessControlService.setUserForOperation(currentUser);
    });
    it('returns true when type does not support access control', async () => {
      mockTypeRegistry.supportsAccessControl.mockReturnValue(false);

      const result = accessControlService.canModifyObject({
        type: 'dashboard',
        object: { type: 'dashboard', id: 'my-dashboard' },
      });

      expect(result).toBe(true);
      expect(mockTypeRegistry.supportsAccessControl).toHaveBeenCalledWith('dashboard');
    });

    it('returns true when object has no access control defined', async () => {
      const result = accessControlService.canModifyObject({
        type: 'dashboard',
        object: { type: 'dashboard', id: 'my-dashboard' },
      });

      expect(result).toBe(true);
    });

    it('returns false when there is no current user', async () => {
      accessControlService.setUserForOperation(null);

      const result = accessControlService.canModifyObject({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'anotheruser' },
        },
      });

      expect(result).toBe(false);
    });

    it('returns true when the access mode is not read_only', async () => {
      const result = accessControlService.canModifyObject({
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
      const result = accessControlService.canModifyObject({
        type: 'dashboard',
        object: {
          type: 'dashboard',
          id: 'my-dashboard',
          accessControl: { accessMode: 'read_only', owner: 'testuser' },
        },
      });

      expect(result).toBe(true);
    });
  });
});
