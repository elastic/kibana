/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, ISavedObjectTypeRegistry } from '@kbn/core/server';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';

import { AccessControlService } from './access_control_service';

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
          authentication_realm: { name: '', type: '' },
          lookup_realm: { name: '', type: '' },
          authentication_provider: { name: 'basic', type: 'basic' },
          authentication_type: 'basic',
          roles: [],
          enabled: true,
          elastic_cloud_user: false,
        })
      : null;

  describe('getTypesRequiringAccessControlPrivilegeCheck', () => {
    let service: AccessControlService;

    beforeEach(() => {
      service = new AccessControlService();
    });

    it('returns type if object is read_only, has owner, and user is not owner', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          type: 'dashboard',
          id: 'id_1',
          accessControl: { accessMode: 'read_only' as const, owner: 'alice' },
        },
      ];
      const { typesRequiringAccessControl } = service.getTypesRequiringPrivilegeCheck({
        objects,
        typeRegistry,
      });
      expect(typesRequiringAccessControl.has('dashboard')).toBe(true);
    });

    it('does not return type if user is owner', () => {
      service.setUserForOperation(makeUser('alice'));
      const objects = [
        {
          type: 'dashboard',
          id: 'id_1',
          accessControl: { accessMode: 'read_only' as const, owner: 'alice' },
        },
      ];
      const { typesRequiringAccessControl } = service.getTypesRequiringPrivilegeCheck({
        objects,
        typeRegistry,
      });
      expect(typesRequiringAccessControl.size).toBe(0);
    });

    it('does not return type if accessControl is missing', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          id: '1',
          type: 'dashboard',
        },
      ];
      const { typesRequiringAccessControl } = service.getTypesRequiringPrivilegeCheck({
        objects,
        typeRegistry,
      });
      expect(typesRequiringAccessControl.size).toBe(0);
    });

    it('does not return type if accessMode is not read_only', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          id: '1',
          type: 'dashboard',
          accessControl: { owner: 'alice', accessMode: 'default' as const },
        },
      ];
      const { typesRequiringAccessControl } = service.getTypesRequiringPrivilegeCheck({
        objects,
        typeRegistry,
      });
      expect(typesRequiringAccessControl.size).toBe(0);
    });

    it('does not return type if supportsAccessControl is false', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          id: '1',
          type: 'visualization',
          accessControl: { accessMode: 'read_only' as const, owner: 'alice' },
        },
      ];
      const { typesRequiringAccessControl } = service.getTypesRequiringPrivilegeCheck({
        objects,
        typeRegistry,
      });
      expect(typesRequiringAccessControl.size).toBe(0);
    });

    it('does not return type if user is null', () => {
      service.setUserForOperation(null);
      const objects = [
        {
          id: '1',
          type: 'dashboard',
          accessControl: { accessMode: 'read_only' as const, owner: 'alice' },
        },
      ];
      const { typesRequiringAccessControl } = service.getTypesRequiringPrivilegeCheck({
        objects,
        typeRegistry,
      });
      expect(typesRequiringAccessControl.size).toBe(0);
    });

    it('returns all types that require access control when multiple objects are passed', () => {
      service.setUserForOperation(makeUser('bob'));
      const objects = [
        {
          type: 'dashboard',
          id: 'id_1',
          accessControl: { accessMode: 'read_only' as const, owner: 'alice' },
        },
        {
          type: 'dashboard',
          id: 'id_2',
          accessControl: { accessMode: 'read_only' as const, owner: 'charlie' },
        },
        {
          type: 'visualization',
          id: 'id_3',
          accessControl: { accessMode: 'read_only' as const, owner: 'alice' },
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
          accessControl: { accessMode: 'read_only' as const, owner: 'bob' }, // user is owner
        },
      ];
      const { typesRequiringAccessControl } = service.getTypesRequiringPrivilegeCheck({
        objects,
        typeRegistry,
      });
      expect(typesRequiringAccessControl.has('dashboard')).toBe(true);
      expect(typesRequiringAccessControl.has('visualization')).toBe(false);
      expect(typesRequiringAccessControl.size).toBe(1);
    });
  });

  describe('enforceAccessControl', () => {
    let service: AccessControlService;
    beforeEach(() => {
      service = new AccessControlService();
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
