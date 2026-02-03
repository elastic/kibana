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

    describe(`non-owner scenarios`, () => {
      // Non-owner objects have requiresManageAccessControl: true
      it('throws if authorizationResult.status is "unauthorized"', () => {
        const authorizationResult = makeAuthResult('unauthorized');
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            // Non-owner object: requiresManageAccessControl = true
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: '1', requiresManageAccessControl: true },
            ],
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
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: '1', requiresManageAccessControl: true },
            ],
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
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: '1', requiresManageAccessControl: true },
            ],
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
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: '1', requiresManageAccessControl: true },
            ],
            currentSpace: 'default',
          })
        ).not.toThrow();
      });

      it('does not throw if objectsRequiringPrivilegeCheck is empty', () => {
        const authorizationResult = makeAuthResult('fully_authorized', {});
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [],
            currentSpace: 'default',
          })
        ).not.toThrow();
      });
    });

    describe(`owner scenarios`, () => {
      // Owner objects have requiresManageAccessControl: false (they need RBAC/update privilege instead)
      it('throws if authorizationResult.status is "unauthorized"', () => {
        const authorizationResult = makeAuthResult('unauthorized');
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            // Owner object: requiresManageAccessControl = false
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: '1', requiresManageAccessControl: false },
            ],
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
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: '1', requiresManageAccessControl: false },
            ],
            currentSpace: 'default',
          })
        ).toThrow(/Access denied/);
      });

      it('does not throw if globally authorized', () => {
        const authorizationResult = makeAuthResult('fully_authorized', {
          dashboard: {
            update: {
              isGloballyAuthorized: true,
              authorizedSpaces: [],
            },
          },
        });
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: '1', requiresManageAccessControl: false },
            ],
            currentSpace: 'default',
          })
        ).not.toThrow();
      });

      it('does not throw if authorized in current space', () => {
        const authorizationResult = makeAuthResult('fully_authorized', {
          dashboard: {
            update: {
              isGloballyAuthorized: false,
              authorizedSpaces: ['default'],
            },
          },
        });
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: '1', requiresManageAccessControl: false },
            ],
            currentSpace: 'default',
          })
        ).not.toThrow();
      });

      it('does not throw if objectsRequiringPrivilegeCheck is empty', () => {
        const authorizationResult = makeAuthResult('fully_authorized', {});
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [],
            currentSpace: 'default',
          })
        ).not.toThrow();
      });
    });

    describe('error message content', () => {
      it('includes unauthorized access control objects in error when non-owner lacks manage_access_control privilege', () => {
        const authorizationResult = makeAuthResult('partially_authorized', {
          dashboard: {
            manage_access_control: {
              isGloballyAuthorized: false,
              authorizedSpaces: ['other-space'],
            },
          },
        });
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: 'obj-123', requiresManageAccessControl: true },
            ],
            currentSpace: 'default',
          })
        ).toThrow(
          /Unable to manage access control for objects dashboard:obj-123: the "manage_access_control" privilege is required/
        );
      });

      it('includes multiple unauthorized access control objects in error message', () => {
        const authorizationResult = makeAuthResult('partially_authorized', {
          dashboard: {
            manage_access_control: {
              isGloballyAuthorized: false,
              authorizedSpaces: [], // Not authorized in any space
            },
          },
        });
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: 'obj-1', requiresManageAccessControl: true },
              { type: 'dashboard', id: 'obj-2', requiresManageAccessControl: true },
            ],
            currentSpace: 'default',
          })
        ).toThrow(
          /Unable to manage access control for objects dashboard:obj-1, dashboard:obj-2: the "manage_access_control" privilege is required/
        );
      });

      it('includes unauthorized RBAC types in error when owner lacks update privilege', () => {
        const authorizationResult = makeAuthResult('partially_authorized', {
          dashboard: {
            update: {
              isGloballyAuthorized: false,
              authorizedSpaces: ['other-space'], // Not authorized in 'default' space
            },
          },
        });
        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: 'obj-456', requiresManageAccessControl: false },
            ],
            currentSpace: 'default',
          })
        ).toThrow(
          /Unable to perform manage access control for types dashboard\. The "update" privilege is required to change access control of objects owned by the current user/
        );
      });

      it('includes both RBAC types and access control objects in error for mixed scenarios', () => {
        // Mixed scenario: owner object lacking update privilege AND non-owner object lacking manage_access_control
        const authorizationResult = makeAuthResult('partially_authorized', {
          dashboard: {
            update: {
              isGloballyAuthorized: false,
              authorizedSpaces: [], // Owner not authorized
            },
            manage_access_control: {
              isGloballyAuthorized: false,
              authorizedSpaces: [], // Non-owner not authorized
            },
          },
        });
        const errorFn = () =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: 'owner-obj', requiresManageAccessControl: false }, // Owner object
              { type: 'dashboard', id: 'non-owner-obj', requiresManageAccessControl: true }, // Non-owner object
            ],
            currentSpace: 'default',
          });

        // Error should include both the RBAC type message and the access control objects message
        expect(errorFn).toThrow(/Unable to perform manage access control for types dashboard/);
        expect(errorFn).toThrow(
          /Unable to manage access control for objects dashboard:non-owner-obj/
        );
      });

      it('combines rbacTypes and objectsRequiringAccessControl in a single error message', () => {
        const authorizationResult = makeAuthResult('partially_authorized', {
          dashboard: {
            update: {
              isGloballyAuthorized: false,
              authorizedSpaces: [],
            },
            manage_access_control: {
              isGloballyAuthorized: false,
              authorizedSpaces: [],
            },
          },
        });

        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: 'owner-obj', requiresManageAccessControl: false },
              { type: 'dashboard', id: 'non-owner-obj', requiresManageAccessControl: true },
            ],
            currentSpace: 'default',
          })
        ).toThrow(
          'Access denied: Unable to perform manage access control for types dashboard. ' +
            'The "update" privilege is required to change access control of objects owned by the current user. ' +
            'Unable to manage access control for objects dashboard:non-owner-obj: ' +
            'the "manage_access_control" privilege is required to change access control of objects owned by another user.'
        );
      });

      it('calls addAuditEventFn with all unauthorized types when access control check fails', () => {
        const addAuditEventFn = jest.fn();
        const authorizationResult = makeAuthResult('partially_authorized', {
          dashboard: {
            update: {
              isGloballyAuthorized: false,
              authorizedSpaces: [],
            },
            manage_access_control: {
              isGloballyAuthorized: false,
              authorizedSpaces: [],
            },
          },
        });

        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: 'obj-1', requiresManageAccessControl: false },
              { type: 'dashboard', id: 'obj-2', requiresManageAccessControl: true },
            ],
            currentSpace: 'default',
            addAuditEventFn,
          })
        ).toThrow(/Access denied/);

        // Should be called with all unauthorized types (deduplicated and sorted)
        expect(addAuditEventFn).toHaveBeenCalledWith(['dashboard']);
      });

      it('filters unauthorized objects to only include types that failed manage_access_control check', () => {
        const authorizationResult = makeAuthResult('partially_authorized', {
          dashboard: {
            manage_access_control: {
              isGloballyAuthorized: true, // Dashboard HAS manage_access_control privilege
              authorizedSpaces: [],
            },
            update: {
              isGloballyAuthorized: false,
              authorizedSpaces: [], // But lacks update privilege
            },
          },
        });

        expect(() =>
          service.enforceAccessControl({
            authorizationResult,
            objectsRequiringPrivilegeCheck: [
              { type: 'dashboard', id: 'owner-obj', requiresManageAccessControl: false },
            ],
            currentSpace: 'default',
          })
        ).toThrow(
          /Unable to perform manage access control for types dashboard\. The "update" privilege is required/
        );
      });
    });
  });
});
