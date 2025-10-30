/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, ISavedObjectTypeRegistry } from '@kbn/core/server';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';

import { AccessControlService } from './access_control_service';
import { SecurityAction } from './types';

describe('AccessControlService', () => {
  // Mock type registry (expand to satisfy ISavedObjectTypeRegistry)
  const typeRegistry = {
    supportsAccessControl: (type: string) => type === 'dashboard',
  } as unknown as jest.Mocked<ISavedObjectTypeRegistry>;

  // Full AuthenticatedUser mock
  const makeUser = (profileUid: string | null): AuthenticatedUser | null =>
    profileUid
      ? mockAuthenticatedUser({
          username: profileUid,
          profile_uid: profileUid,
        })
      : null;

  describe('#getTypesRequiringPrivilegeCheck', () => {
    let service: AccessControlService;

    beforeEach(() => {
      service = new AccessControlService({ typeRegistry });
    });

    it('returns type if object is write_restricted, has owner, and user is not owner', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          type: 'dashboard',
          id: 'id_1',
          accessControl: { accessMode: 'write_restricted' as const, owner: 'alice' },
        },
      ];
      const { types: typesRequiringAccessControl, objects: results } =
        service.getObjectsRequiringPrivilegeCheck({
          objects,
          actions: new Set([SecurityAction.CHANGE_OWNERSHIP]),
        });
      expect(typesRequiringAccessControl.has('dashboard')).toBe(true);
      expect(results).toEqual([
        {
          type: 'dashboard',
          id: 'id_1',
          requiresManageAccessControl: true,
        },
      ]);
    });

    it('does not return type if user is owner', () => {
      service.setUserForOperation(makeUser('alice'));
      const objects = [
        {
          type: 'dashboard',
          id: 'id_1',
          accessControl: { accessMode: 'write_restricted' as const, owner: 'alice' },
        },
      ];
      const { types: typesRequiringAccessControl, objects: results } =
        service.getObjectsRequiringPrivilegeCheck({
          objects,
          actions: new Set([SecurityAction.CHANGE_OWNERSHIP]),
        });
      expect(typesRequiringAccessControl.size).toBe(0);
      expect(results).toEqual([
        {
          type: 'dashboard',
          id: 'id_1',
          requiresManageAccessControl: false,
        },
      ]);
    });

    it('does not return type if accessControl is missing', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          id: '1',
          type: 'dashboard',
        },
      ];
      const { types: typesRequiringAccessControl, objects: results } =
        service.getObjectsRequiringPrivilegeCheck({
          objects,
          actions: new Set([SecurityAction.CHANGE_OWNERSHIP]),
        });
      expect(typesRequiringAccessControl.size).toBe(0);
      expect(results).toEqual([
        {
          type: 'dashboard',
          id: '1',
          requiresManageAccessControl: false,
        },
      ]);
    });

    it('does not return type if supportsAccessControl is false', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          id: '1',
          type: 'visualization',
          accessControl: { accessMode: 'write_restricted' as const, owner: 'alice' },
        },
      ];
      const { types: typesRequiringAccessControl, objects: results } =
        service.getObjectsRequiringPrivilegeCheck({
          objects,
          actions: new Set([SecurityAction.CHANGE_OWNERSHIP]),
        });
      expect(typesRequiringAccessControl.size).toBe(0);
      expect(results).toEqual([
        {
          type: 'visualization',
          id: '1',
          requiresManageAccessControl: false,
        },
      ]);
    });

    it('does not return type if user is null', () => {
      service.setUserForOperation(null);
      const objects = [
        {
          id: '1',
          type: 'dashboard',
          accessControl: { accessMode: 'write_restricted' as const, owner: 'alice' },
        },
      ];
      const { types: typesRequiringAccessControl, objects: results } =
        service.getObjectsRequiringPrivilegeCheck({
          objects,
          actions: new Set([SecurityAction.CHANGE_OWNERSHIP]),
        });
      expect(typesRequiringAccessControl.size).toBe(0);
      expect(results).toEqual([
        {
          type: 'dashboard',
          id: '1',
          requiresManageAccessControl: false,
        },
      ]);
    });

    it('returns all types that require access control when multiple objects are passed', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          type: 'dashboard',
          id: 'id_1',
          accessControl: { accessMode: 'write_restricted' as const, owner: 'alice' },
        },
        {
          type: 'dashboard',
          id: 'id_2',
          accessControl: { accessMode: 'write_restricted' as const, owner: 'charlie' },
        },
        {
          type: 'visualization',
          id: 'id_3',
          accessControl: { accessMode: 'write_restricted' as const, owner: 'alice' },
        },
        {
          type: 'dashboard',
          id: 'id_4',
          accessControl: { accessMode: 'default' as const, owner: 'alice' },
        },
        {
          type: 'dashboard',
          id: 'id_5',
        },
        {
          type: 'dashboard',
          id: 'id_6',
          accessControl: { accessMode: 'write_restricted' as const, owner: 'bob' }, // user is owner
        },
      ];
      const { types: typesRequiringAccessControl, objects: results } =
        service.getObjectsRequiringPrivilegeCheck({
          objects,
          actions: new Set([SecurityAction.CHANGE_OWNERSHIP]),
        });
      expect(typesRequiringAccessControl.has('dashboard')).toBe(true);
      expect(typesRequiringAccessControl.has('visualization')).toBe(false);
      expect(typesRequiringAccessControl.size).toBe(1);
      expect(results).toEqual([
        {
          id: 'id_1',
          requiresManageAccessControl: true, // owned by another user
          type: 'dashboard',
        },
        {
          id: 'id_2',
          requiresManageAccessControl: true, // owned by another user
          type: 'dashboard',
        },
        {
          id: 'id_3',
          requiresManageAccessControl: false, // does not support access control
          type: 'visualization',
        },
        {
          id: 'id_4',
          requiresManageAccessControl: true, // owned by another user
          type: 'dashboard',
        },
        {
          id: 'id_5',
          requiresManageAccessControl: false, // no access control
          type: 'dashboard',
        },
        {
          id: 'id_6',
          requiresManageAccessControl: false, // user is owner
          type: 'dashboard',
        },
      ]);
    });

    describe('when accessMode is default', () => {
      it('change ownership action returns type if user is not owner', () => {
        service.setUserForOperation(makeUser('bob'));
        const objects = [
          {
            type: 'dashboard',
            id: 'id_1',
            accessControl: { accessMode: 'default' as const, owner: 'alice' },
          },
        ];
        const { types: typesRequiringAccessControl } = service.getObjectsRequiringPrivilegeCheck({
          objects,
          actions: new Set([SecurityAction.CHANGE_OWNERSHIP]),
        });
        expect(typesRequiringAccessControl.has('dashboard')).toBe(true);
      });

      it('change access mode action returns type if user is not owner', () => {
        service.setUserForOperation(makeUser('bob'));
        const objects = [
          {
            type: 'dashboard',
            id: 'id_1',
            accessControl: { accessMode: 'default' as const, owner: 'alice' },
          },
        ];
        const { types: typesRequiringAccessControl } = service.getObjectsRequiringPrivilegeCheck({
          objects,
          actions: new Set([SecurityAction.CHANGE_ACCESS_MODE]),
        });
        expect(typesRequiringAccessControl.has('dashboard')).toBe(true);
      });
    });
  });

  describe('#enforceAccessControl', () => {
    let service: AccessControlService;
    beforeEach(() => {
      service = new AccessControlService({ typeRegistry });
    });

    const makeAuthResult = (
      status: 'unauthorized' | 'partially_authorized' | 'fully_authorized',
      typeMap: Record<string, any> = {}
    ) => ({
      status,
      typeMap: new Map(Object.entries(typeMap)),
    });

    it('throws if authorizationResult.status is "unauthorized"', () => {
      const authorizationResult = makeAuthResult('unauthorized');
      expect(() =>
        service.enforceAccessControl({
          authorizationResult,
          typesRequiringAccessControl: new Set(['dashboard']),
          currentSpace: 'default',
        })
      ).toThrow(/Access denied/);
    });

    it('throws if not globally authorized and not authorized in current space', () => {
      const authorizationResult = makeAuthResult('partially_authorized', {
        dashboard: {
          manage_access_control: {
            isGloballyAuthorized: false,
            authorizedSpaces: ['foo'],
          },
        },
      });
      expect(() =>
        service.enforceAccessControl({
          authorizationResult,
          typesRequiringAccessControl: new Set(['dashboard']),
          currentSpace: 'default',
        })
      ).toThrow(/Access denied/);
    });

    it('does not throw if globally authorized', () => {
      const authorizationResult = makeAuthResult('fully_authorized', {
        dashboard: {
          manage_access_control: {
            isGloballyAuthorized: true,
            authorizedSpaces: [],
          },
        },
      });
      expect(() =>
        service.enforceAccessControl({
          authorizationResult,
          typesRequiringAccessControl: new Set(['dashboard']),
          currentSpace: 'default',
        })
      ).not.toThrow();
    });

    it('does not throw if authorized in current space', () => {
      const authorizationResult = makeAuthResult('fully_authorized', {
        dashboard: {
          manage_access_control: {
            isGloballyAuthorized: false,
            authorizedSpaces: ['default'],
          },
        },
      });
      expect(() =>
        service.enforceAccessControl({
          authorizationResult,
          typesRequiringAccessControl: new Set(['dashboard']),
          currentSpace: 'default',
        })
      ).not.toThrow();
    });

    it('does not throw if typesRequiringAccessControl is empty', () => {
      const authorizationResult = makeAuthResult('fully_authorized', {});
      expect(() =>
        service.enforceAccessControl({
          authorizationResult,
          typesRequiringAccessControl: new Set(),
          currentSpace: 'default',
        })
      ).not.toThrow();
    });
  });
});
