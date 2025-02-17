/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectReferenceWithContext,
  SavedObjectsClient,
  SavedObjectsFindResult,
  SavedObjectsResolveResponse,
} from '@kbn/core/server';
import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
import type {
  AuthorizeBulkGetObject,
  AuthorizeCreateObject,
  AuthorizeObjectWithExistingSpaces,
  AuthorizeUpdateObject,
  BulkResolveError,
} from '@kbn/core-saved-objects-server';
import type {
  CheckPrivilegesResponse,
  CheckSavedObjectsPrivileges,
} from '@kbn/security-plugin-types-server';

import {
  AuditAction,
  SavedObjectsSecurityExtension,
  SecurityAction,
} from './saved_objects_security_extension';
import { auditLoggerMock } from '../audit/mocks';
import { Actions } from '../authorization';

const checkAuthorizationSpy = jest.spyOn(
  SavedObjectsSecurityExtension.prototype as any,
  'checkAuthorization'
);
const enforceAuthorizationSpy = jest.spyOn(
  SavedObjectsSecurityExtension.prototype as any,
  'enforceAuthorization'
);
const redactNamespacesSpy = jest.spyOn(
  SavedObjectsSecurityExtension.prototype as any,
  'redactNamespaces'
);
const authorizeSpy = jest.spyOn(SavedObjectsSecurityExtension.prototype as any, 'authorize');
const auditHelperSpy = jest.spyOn(SavedObjectsSecurityExtension.prototype as any, 'auditHelper');
const addAuditEventSpy = jest.spyOn(
  SavedObjectsSecurityExtension.prototype as any,
  'addAuditEvent'
);
const getCurrentUser = jest.fn();

const obj1 = {
  type: 'a',
  id: '6.0.0-alpha1',
  objectNamespace: 'foo',
  initialNamespaces: ['foo'],
  existingNamespaces: [],
  name: 'a_object_name',
};
const obj2 = {
  type: 'b',
  id: 'logstash-*',
  objectNamespace: undefined,
  initialNamespaces: undefined,
  existingNamespaces: [],
  name: 'b_object_name',
};
const obj3 = {
  type: 'c',
  id: '6.0.0-charlie3',
  objectNamespace: undefined,
  initialNamespaces: undefined,
  existingNamespaces: ['bar'],
  name: 'c_object_name',
};
const obj4 = {
  type: 'd',
  id: '6.0.0-disco4',
  objectNamespace: 'y',
  initialNamespaces: ['y'],
  existingNamespaces: ['z'],
  name: 'd_object_name',
};

function setupSimpleCheckPrivsMockResolve(
  checkPrivileges: jest.MockedFunction<CheckSavedObjectsPrivileges>,
  type: string,
  action: string,
  authorized: boolean
) {
  checkPrivileges.mockResolvedValue({
    hasAllRequested: authorized,
    privileges: {
      kibana: [
        { privilege: `mock-saved_object:${type}/${action}`, authorized },
        { privilege: 'login:', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse);
}

function setup({ includeSavedObjectNames = true }: { includeSavedObjectNames?: boolean } = {}) {
  const actions = new Actions();
  jest
    .spyOn(actions.savedObject, 'get')
    .mockImplementation((type: string, action: string) => `mock-saved_object:${type}/${action}`);
  const auditLogger = auditLoggerMock.create();
  // @ts-expect-error
  auditLogger.includeSavedObjectNames = includeSavedObjectNames;
  const errors = {
    decorateForbiddenError: jest.fn().mockImplementation((err) => err),
    decorateGeneralError: jest.fn().mockImplementation((err) => err),
  } as unknown as jest.Mocked<SavedObjectsClient['errors']>;
  const checkPrivileges: jest.MockedFunction<CheckSavedObjectsPrivileges> = jest.fn();
  const securityExtension = new SavedObjectsSecurityExtension({
    actions,
    auditLogger,
    errors,
    checkPrivileges,
    getCurrentUser,
  });
  return { actions, auditLogger, errors, checkPrivileges, securityExtension };
}

describe('#authorize (unpublished by interface)', () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
        { privilege: 'mock-saved_object:a/create', authorized: true },
        { privilege: 'login:', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:c/create', authorized: true },
        { resource: 'y', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
        { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: true },
        { resource: 'y', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
        { resource: 'y', privilege: 'mock-saved_object:c/create', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  describe('without enforce', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    const actions = new Set([SecurityAction.BULK_UPDATE, SecurityAction.CREATE]);

    test('checks authorization with expected actions, types, and spaces', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      // Disable to test method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({ types, spaces, actions });
      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set(['bulk_update', 'create']),
        spaces,
        types,
        options: { allowGlobalResource: false },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          'mock-saved_object:a/bulk_update',
          'mock-saved_object:a/create',
          'mock-saved_object:b/bulk_update',
          'mock-saved_object:b/create',
          'mock-saved_object:c/bulk_update',
          'mock-saved_object:c/create',
          'login:',
        ],
        [...spaces]
      );
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test('throws an error when `types` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();

      await expect(
        // Disable to test method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({ types: new Set(), spaces, actions })
      ).rejects.toThrowError('No types specified for authorization');
      expect(checkAuthorizationSpy).not.toHaveBeenCalled();
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `spaces` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();

      await expect(
        // Disable to test method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({ types, spaces: new Set(), actions })
      ).rejects.toThrowError('No spaces specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `actions` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();

      await expect(
        // Disable to test method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({ types, spaces, actions: new Set() })
      ).rejects.toThrowError('No actions specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when privilege check fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        // Disable to test method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({ types, spaces, actions })
      ).rejects.toThrowError('Oh no!');
    });

    test('fully authorized', async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      // Disable to test method
      // eslint-disable-next-line dot-notation
      const result = await securityExtension['authorize']({ types, spaces, actions });
      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled(); // We're performing authz but no enforce, therefore no audit
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map()
          .set('a', {
            create: { isGloballyAuthorized: true, authorizedSpaces: [] },
            bulk_update: { isGloballyAuthorized: true, authorizedSpaces: [] },
            // Technically, 'login:' is not a saved object action, it is a Kibana privilege -- however, we include it in the `typeMap` results
            // for ease of use with the `redactNamespaces` function. The user is never actually authorized to "login" for a given object type,
            // they are authorized to log in on a per-space basis, and this is applied to each object type in the typeMap result accordingly.
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set('b', {
            create: { authorizedSpaces: ['x', 'y'] },
            bulk_update: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set('c', {
            create: { authorizedSpaces: ['x', 'y'] },
            bulk_update: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
    });

    test('partially authorized', async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            // For type 'a', the user is authorized to use 'create' action but not 'update' action (all spaces)
            // For type 'b', the user is authorized to use 'create' action but not 'update' action (both spaces)
            // For type 'c', the user is authorized to use both actions in space 'x' but not space 'y'
            { privilege: 'mock-saved_object:a/create', authorized: true },
            { privilege: 'mock-saved_object:a/bulk_update', authorized: false },
            { privilege: 'mock-saved_object:a/bulk_update', authorized: true }, // fail-secure check
            { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: false },
            { resource: 'x', privilege: 'mock-saved_object:c/create', authorized: true },
            { privilege: 'mock-saved_object:c/create', authorized: false }, // inverse fail-secure check
            { resource: 'x', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
            { resource: 'x', privilege: 'login:', authorized: true },
            { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: true },
            { resource: 'y', privilege: 'mock-saved_object:b/bulk_update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:c/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:c/bulk_update', authorized: false },
            { privilege: 'mock-saved_object:c/bulk_update', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'mock-saved_object:c/bulk_update', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'login:', authorized: true },
            // The fail-secure checks are a contrived scenario, as we *shouldn't* get both an unauthorized and authorized result for a given resource...
            // However, in case we do, we should fail-secure (authorized + unauthorized = unauthorized)
          ],
        },
      } as CheckPrivilegesResponse);

      // Disable to test method
      // eslint-disable-next-line dot-notation
      const result = await securityExtension['authorize']({ types, spaces, actions });
      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled(); // We're performing authz but no enforce, therefore no audit
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set('a', {
            create: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { authorizedSpaces: ['x', 'y'] },
          })
          .set('b', {
            create: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { authorizedSpaces: ['x', 'y'] },
          })
          .set('c', {
            bulk_update: { authorizedSpaces: ['x'] },
            create: { authorizedSpaces: ['x'] },
            ['login:']: { authorizedSpaces: ['x', 'y'] },
          }),
      });
    });

    test('unauthorized', async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/create', authorized: false },
            { privilege: 'mock-saved_object:a/update', authorized: false },
            { privilege: 'mock-saved_object:a/update', authorized: true }, // fail-secure check
            { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: false },
            { resource: 'x', privilege: 'mock-saved_object:b/update', authorized: false },
            { resource: 'x', privilege: 'mock-saved_object:c/create', authorized: false },
            { resource: 'x', privilege: 'mock-saved_object:c/update', authorized: false },
            { resource: 'x', privilege: 'login:', authorized: false },
            { resource: 'x', privilege: 'login:', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'mock-saved_object:a/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:a/update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:b/update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:c/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:c/update', authorized: false },
            { privilege: 'mock-saved_object:c/update', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'mock-saved_object:c/update', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'login:', authorized: true }, // should *not* result in a 'partially_authorized' status
            // The fail-secure checks are a contrived scenario, as we *shouldn't* get both an unauthorized and authorized result for a given resource...
            // However, in case we do, we should fail-secure (authorized + unauthorized = unauthorized)
          ],
        },
      } as CheckPrivilegesResponse);

      // Disable to test method
      // eslint-disable-next-line dot-notation
      const result = await securityExtension['authorize']({ types, spaces, actions });
      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled(); // We're performing authz but no enforce, therefore no audit
      expect(result).toEqual({
        // The user is authorized to log into space Y, but they are not authorized to take any actions on any of the requested object types.
        // Therefore, the status is 'unauthorized'.
        status: 'unauthorized',
        typeMap: new Map()
          .set('a', { ['login:']: { authorizedSpaces: ['y'] } })
          .set('b', { ['login:']: { authorizedSpaces: ['y'] } })
          .set('c', { ['login:']: { authorizedSpaces: ['y'] } }),
      });
    });

    test('conflicting privilege failsafe', async () => {
      const conflictingPrivilegesResponse = {
        hasAllRequested: true,
        privileges: {
          kibana: [
            // redundant conflicting privileges for space X, type B, action Create
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse;

      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(conflictingPrivilegesResponse);

      // Disable to test method
      // eslint-disable-next-line dot-notation
      const result = await securityExtension['authorize']({ types, spaces, actions });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set('b', {
          bulk_update: { authorizedSpaces: ['y'] }, // should NOT be authorized for conflicted privilege
        }),
      });
    });
  });

  describe('with enforce', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    const actions = new Set([SecurityAction.BULK_UPDATE, SecurityAction.CREATE]);

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const unauthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:a/bulk_update', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    describe(`fully authorized`, () => {
      test('adds default audit event', async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        // Disable to test method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(2);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'User is updating saved objects',
        });
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'User is creating saved objects',
        });
      });

      test(`adds audit event with success outcome when 'useSuccessOutcome' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        // Disable to test method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
          auditOptions: { useSuccessOutcome: true },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(2);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'success',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'User has updated saved objects',
        });
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'success',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'User has created saved objects',
        });
      });

      test(`adds audit event per object when 'objects' is populated`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        const enforceMap = new Map([
          ['a', new Set(['x', 'y', 'z'])],
          ['b', new Set(['x', 'y'])],
          ['c', new Set(['y'])],
        ]);

        // Disable to test method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap,
          auditOptions: {
            objects: auditObjects,
          },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length * 2); // 2 actions
        let i = 1;
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
            error: undefined,
            event: {
              action: AuditAction.UPDATE,
              category: ['database'],
              outcome: 'unknown',
              type: ['change'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              unauthorized_spaces: undefined,
              unauthorized_types: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `User is updating ${obj.type} [id=${obj.id}]`,
          });
        }
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
            error: undefined,
            event: {
              action: AuditAction.CREATE,
              category: ['database'],
              outcome: 'unknown',
              type: ['creation'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              unauthorized_spaces: undefined,
              unauthorized_types: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `User is creating ${obj.type} [id=${obj.id}]`,
          });
        }
      });

      test(`adds audit event per object with success outcome when 'objects' is populated and 'useSuccessOutcome' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        const enforceMap = new Map([
          ['a', new Set(['x', 'y', 'z'])],
          ['b', new Set(['x', 'y'])],
          ['c', new Set(['y'])],
        ]);

        // Disable to test method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap,
          auditOptions: {
            objects: auditObjects,
            useSuccessOutcome: true,
          },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length * 2); // two action
        let i = 1;
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
            error: undefined,
            event: {
              action: AuditAction.UPDATE,
              category: ['database'],
              outcome: 'success',
              type: ['change'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              unauthorized_spaces: undefined,
              unauthorized_types: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `User has updated ${obj.type} [id=${obj.id}]`,
          });
        }
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
            error: undefined,
            event: {
              action: AuditAction.CREATE,
              category: ['database'],
              outcome: 'success',
              type: ['creation'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              unauthorized_spaces: undefined,
              unauthorized_types: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `User has created ${obj.type} [id=${obj.id}]`,
          });
        }
      });

      test(`does not add audit events when 'bypassOnSuccess' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        // Disable to test method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
          auditOptions: {
            objects: auditObjects,
            bypass: 'on_success',
          },
        });

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      test(`auditOptions.bypassOnFailure' has no effect`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        // Disable to test method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
          auditOptions: { bypass: 'on_failure' },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(actions.size);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'User is updating saved objects',
        });
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'User is creating saved objects',
        });
      });
    });

    describe(`partially authorized`, () => {
      test('throws error and adds default audit event', async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

        await expect(() =>
          // Disable to test method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
          })
        ).rejects.toThrowError('Unable to bulk_update b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: 'Unable to bulk_update b,c',
          },
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'failure',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'Failed attempt to update saved objects',
        });
      });

      test(`throws error and adds audit event per object when 'objects' is populated`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        const enforceMap = new Map([
          ['a', new Set(['x', 'y', 'z'])],
          ['b', new Set(['x', 'y'])],
          ['c', new Set(['x', 'y'])],
        ]);
        await expect(() =>
          // Disable to test method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap,
            auditOptions: { objects: auditObjects },
          })
        ).rejects.toThrowError('Unable to bulk_update b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length);
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenCalledWith({
            error: {
              code: 'Error',
              message: 'Unable to bulk_update b,c',
            },
            event: {
              action: AuditAction.UPDATE,
              category: ['database'],
              outcome: 'failure',
              type: ['change'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              unauthorized_spaces: undefined,
              unauthorized_types: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `Failed attempt to update ${obj.type} [id=${obj.id}]`,
          });
        }
      });

      test(`throws error and does not add an audit event when 'bypassOnFailure' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        await expect(() =>
          // Disable to test method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { objects: auditObjects, bypass: 'on_failure' },
          })
        ).rejects.toThrowError('Unable to bulk_update b,c');

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      test(`auditOptions.bypassOnSuccess' has no effect`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

        await expect(() =>
          // Disable to test method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { bypass: 'on_success' },
          })
        ).rejects.toThrowError('Unable to bulk_update b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: 'Unable to bulk_update b,c',
          },
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'failure',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'Failed attempt to update saved objects',
        });
      });
    });

    describe(`unauthorized`, () => {
      test('throws error and adds default audit event', async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

        const enforceMap = new Map([
          ['a', new Set(['y', 'z'])],
          ['b', new Set(['x', 'z'])],
          ['c', new Set(['x', 'y'])],
        ]);
        await expect(() =>
          // Disable to test method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap,
          })
        ).rejects.toThrowError('Unable to bulk_update a,b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: 'Unable to bulk_update a,b,c',
          },
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'failure',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'Failed attempt to update saved objects',
        });
      });

      test(`throws error and adds audit event per object when 'objects' is populated`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        const enforceMap = new Map([
          ['a', new Set(['x', 'y', 'z'])],
          ['b', new Set(['x', 'y'])],
          ['c', new Set(['x', 'y'])],
        ]);

        await expect(() =>
          // Disable to test method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap,
            auditOptions: { objects: auditObjects },
          })
        ).rejects.toThrowError('Unable to bulk_update a,b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length);
        let i = 1;
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
            error: {
              code: 'Error',
              message: 'Unable to bulk_update a,b,c',
            },
            event: {
              action: AuditAction.UPDATE,
              category: ['database'],
              outcome: 'failure',
              type: ['change'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              unauthorized_spaces: undefined,
              unauthorized_types: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `Failed attempt to update ${obj.type} [id=${obj.id}]`,
          });
        }
      });

      test(`throws error and does not add an audit event when 'bypassOnFailure' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        await expect(() =>
          // Disable to test method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { objects: auditObjects, bypass: 'on_failure' },
          })
        ).rejects.toThrowError('Unable to bulk_update a,b,c');

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      test(`auditOptions.bypassOnSuccess' has no effect`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

        await expect(() =>
          // Disable to test method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['y', 'z'])],
              ['b', new Set(['x', 'z'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { bypass: 'on_success' },
          })
        ).rejects.toThrowError('Unable to bulk_update a,b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: 'Unable to bulk_update a,b,c',
          },
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'failure',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: undefined,
          },
          message: 'Failed attempt to update saved objects',
        });
      });
    });
  });

  describe('security actions with no authorization action', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);

    test('throws no actions error', async () => {
      const { securityExtension } = setup();

      await expect(
        // Disable to test method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({
          types,
          spaces,
          actions: new Set([SecurityAction.CLOSE_POINT_IN_TIME]), // this is currently the only security action that does not require authz
        })
      ).rejects.toThrowError('No actions specified for authorization check');
    });
  });

  describe('scecurity actions with no audit action', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    // Check conflicts is currently the only security action without an audit action
    const actions = new Set([SecurityAction.CHECK_CONFLICTS]);
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const unauthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    test(`does not add audit events when fully authorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const auditObjects = [
        { type: 'a', id: '1' },
        { type: 'b', id: '2' },
        { type: 'c', id: '3' },
      ];

      // Disable to test method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({
        actions,
        types,
        spaces,
        enforceMap: new Map([
          ['a', new Set(['x', 'y', 'z'])],
          ['b', new Set(['x', 'y'])],
          ['c', new Set(['y'])],
        ]),
        auditOptions: {
          objects: auditObjects,
        },
      });

      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    test(`does not add audit events when partially authorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

      const auditObjects = [
        { type: 'a', id: '1' },
        { type: 'b', id: '2' },
        { type: 'c', id: '3' },
      ];

      await expect(
        // Disable to test method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['x', 'y'])],
          ]),
          auditOptions: {
            objects: auditObjects,
          },
        })
      ).rejects.toThrowError('Unable to bulk_create b,c');

      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    test(`does not add audit events when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

      const auditObjects = [
        { type: 'a', id: '1' },
        { type: 'b', id: '2' },
        { type: 'c', id: '3' },
      ];

      await expect(
        // Disable to test method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['y', 'z'])],
            ['b', new Set(['x', 'z'])],
            ['c', new Set(['x', 'y'])],
          ]),
          auditOptions: {
            objects: auditObjects,
          },
        })
      ).rejects.toThrowError('Unable to bulk_create a,b,c');

      expect(auditLogger.log).not.toHaveBeenCalled();
    });
  });
});

describe('#redactNamespaces', () => {
  test(`filters namespaces that the user doesn't have access to`, () => {
    const { securityExtension } = setup();

    const typeMap = new Map().set('so-type', {
      // redact is only concerned with 'login' attribute, not specific action
      ['login:']: { authorizedSpaces: ['authorized-space'] },
    });

    const so = {
      id: 'some-id',
      type: 'so-type',
      namespaces: ['authorized-space', 'unauthorized-space'],
      attributes: {
        test: 'attr',
      },
      score: 1,
      references: [],
    };

    const result = securityExtension.redactNamespaces({ typeMap, savedObject: so });
    expect(result).toEqual(expect.objectContaining({ namespaces: ['authorized-space', '?'] }));
  });

  test(`does not redact on isGloballyAuthorized`, () => {
    const { securityExtension } = setup();

    const typeMap = new Map().set('so-type', {
      // redact is only concerned with 'login' attribute, not specific action
      ['login:']: { isGloballyAuthorized: true },
    });

    const so = {
      id: 'some-id',
      type: 'so-type',
      namespaces: ['space-a', 'space-b', 'space-c'],
      attributes: {
        test: 'attr',
      },
      score: 1,
      references: [],
    };

    const result = securityExtension.redactNamespaces({ typeMap, savedObject: so });
    expect(result).toEqual(
      expect.objectContaining({ namespaces: ['space-a', 'space-b', 'space-c'] })
    );
  });
});

describe('#create', () => {
  const namespace = 'x';

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeCreate`, () => {
    const actionString = 'create';

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeCreate({
          namespace: '',
          object: obj1,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeCreate({ namespace, object: obj1 })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeCreate({
        namespace,
        object: obj1,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.CREATE]);
      const expectedSpaces = new Set([namespace, ...obj1.initialNamespaces!]);
      const expectedTypes = new Set([obj1.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj1.type, new Set([namespace, ...obj1.initialNamespaces!]));
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        options: { allowGlobalResource: true },
        auditOptions: {
          objects: [obj1],
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: true },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.CREATE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: new Map().set(obj1.type, {
          create: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
        auditOptions: { objects: [obj1] },
      });
    });

    test(`returns result when successful`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeCreate({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set(obj1.type, {
          create: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeCreate({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.CREATE,
          category: ['database'],
          outcome: 'unknown',
          type: ['creation'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
        },
        message: `User is creating ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`adds a single audit event without name when includeSavedObjectNames is false`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup({
        includeSavedObjectNames: false,
      });
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeCreate({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.CREATE,
          category: ['database'],
          outcome: 'unknown',
          type: ['creation'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `User is creating ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeCreate({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to create ${obj1.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeCreate({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to create ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to create a',
        },
        event: {
          action: AuditAction.CREATE,
          category: ['database'],
          outcome: 'failure',
          type: ['creation'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
        },
        message: `Failed attempt to create ${obj1.type} [id=${obj1.id}]`,
      });
    });
  });

  describe(`#authorizeBulkCreate`, () => {
    const actionString = 'bulk_create';
    const objects = [obj1, obj2, obj3, obj4];

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
          { resource: 'bar', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedTypes = new Set(objects.map((obj) => obj.type));

    const expectedActions = new Set([SecurityAction.BULK_CREATE]);
    const expectedSpaces = new Set([
      namespace,
      ...obj1.initialNamespaces!,
      ...obj3.existingNamespaces!,
      ...obj4.initialNamespaces!,
      ...obj4.existingNamespaces!,
    ]);

    const expectedEnforceMap = new Map([
      [obj1.type, new Set([namespace, ...obj1.initialNamespaces!])],
      [obj2.type, new Set([namespace])],
      [obj3.type, new Set([namespace])],
      [obj4.type, new Set([namespace, ...obj4.initialNamespaces!])],
    ]);

    const expectedTypeMap = new Map()
      .set('a', {
        bulk_create: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_create: { authorizedSpaces: ['x'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        bulk_create: { authorizedSpaces: ['x', 'bar'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('d', {
        bulk_create: { authorizedSpaces: ['x', 'y', 'z'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test('throws an error when `objects` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      const emptyObjects: AuthorizeCreateObject[] = [];

      await expect(
        securityExtension.authorizeBulkCreate({
          namespace,
          objects: emptyObjects,
        })
      ).rejects.toThrowError('No objects specified for bulk_create authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkCreate({
          namespace: '',
          objects: [obj1, obj2],
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeBulkCreate({ namespace, objects: [obj1] })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeBulkCreate({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        options: { allowGlobalResource: true },
        auditOptions: {
          objects,
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: true },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${obj1.type}/${actionString}`,
          `mock-saved_object:${obj2.type}/${actionString}`,
          `mock-saved_object:${obj3.type}/${actionString}`,
          `mock-saved_object:${obj4.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.BULK_CREATE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: expectedTypeMap,
        auditOptions: { objects },
      });
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkCreate({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
            { resource: 'bar', privilege: 'mock-saved_object:c/bulk_create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
            { resource: 'z', privilege: 'mock-saved_object:d/bulk_create', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkCreate({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set(obj1.type, {
            bulk_create: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj2.type, {
            bulk_create: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj3.type, {
            bulk_create: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj4.type, {
            bulk_create: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkCreate({
        namespace,
        objects,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `User is creating ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkCreate({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_create ${obj2.type},${obj3.type},${obj4.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/create', authorized: false },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkCreate({
          namespace,
          objects,
        })
      ).rejects.toThrow(
        `Unable to bulk_create ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`
      );
      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: `Unable to bulk_create ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`,
          },
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'failure',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `Failed attempt to create ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe('update', () => {
  const namespace = 'x';

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeUpdate`, () => {
    const actionString = 'update';

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeUpdate({
          namespace: '',
          object: obj2,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeUpdate({ namespace, object: obj1 })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeUpdate({
        namespace,
        object: obj1,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.UPDATE]);
      const expectedSpaces = new Set([namespace, obj1.objectNamespace!]);
      const expectedTypes = new Set([obj1.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj1.type, new Set([namespace, obj1.objectNamespace!]));
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          objects: [obj1],
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.UPDATE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: new Map().set(obj1.type, {
          update: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
        auditOptions: { objects: [obj1] },
      });
    });

    test(`returns result when successful`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeUpdate({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set(obj1.type, {
          update: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeUpdate({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.UPDATE,
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
        },
        message: `User is updating ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`adds a single audit event without name when includeSavedObjectNames is false`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup({
        includeSavedObjectNames: false,
      });
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeUpdate({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.UPDATE,
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `User is updating ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeUpdate({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to update ${obj1.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeUpdate({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to update ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to update a',
        },
        event: {
          action: AuditAction.UPDATE,
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
        },
        message: `Failed attempt to update ${obj1.type} [id=${obj1.id}]`,
      });
    });
  });

  describe(`#authorizeBulkUpdate`, () => {
    const actionString = 'bulk_update';
    const objects = [obj1, obj2, obj3, obj4];
    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
          { resource: 'bar', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedTypes = new Set(objects.map((obj) => obj.type));

    const expectedActions = new Set([SecurityAction.BULK_UPDATE]);
    const expectedSpaces = new Set([
      namespace,
      obj1.objectNamespace!,
      ...obj3.existingNamespaces!,
      obj4.objectNamespace!,
      ...obj4.existingNamespaces!,
    ]);

    const expectedEnforceMap = new Map([
      [obj1.type, new Set([namespace, obj1.objectNamespace!])],
      [obj2.type, new Set([namespace])],
      [obj3.type, new Set([namespace])],
      [obj4.type, new Set([namespace, obj4.objectNamespace!])],
    ]);

    const expectedTypeMap = new Map()
      .set('a', {
        bulk_update: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_update: { authorizedSpaces: ['x'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        bulk_update: { authorizedSpaces: ['x', 'bar'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('d', {
        bulk_update: { authorizedSpaces: ['x', 'y', 'z'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test('throws an error when `objects` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      const emptyObjects: AuthorizeUpdateObject[] = [];

      await expect(
        securityExtension.authorizeBulkUpdate({
          namespace,
          objects: emptyObjects,
        })
      ).rejects.toThrowError('No objects specified for bulk_update authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkUpdate({
          namespace: '',
          objects: [obj1, obj2],
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeBulkUpdate({ namespace, objects: [obj1] })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeBulkUpdate({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          objects,
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${obj1.type}/${actionString}`,
          `mock-saved_object:${obj2.type}/${actionString}`,
          `mock-saved_object:${obj3.type}/${actionString}`,
          `mock-saved_object:${obj4.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.BULK_UPDATE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: expectedTypeMap,
        auditOptions: { objects },
      });
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkUpdate({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
            { resource: 'bar', privilege: 'mock-saved_object:c/bulk_update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
            { resource: 'z', privilege: 'mock-saved_object:d/bulk_update', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkUpdate({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set(obj1.type, {
            bulk_update: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj2.type, {
            bulk_update: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj3.type, {
            bulk_update: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj4.type, {
            bulk_update: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkUpdate({
        namespace,
        objects,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `User is updating ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkUpdate({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_update ${obj2.type},${obj3.type},${obj4.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeBulkUpdate({
          namespace,
          objects,
        })
      ).rejects.toThrow(
        `Unable to bulk_update ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`
      );
      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      let i = 1;
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
          error: {
            code: 'Error',
            message: `Unable to bulk_update ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`,
          },
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'failure',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `Failed attempt to update ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe('delete', () => {
  const namespace = 'x';

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeDelete`, () => {
    const actionString = 'delete';

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeDelete({
          namespace: '',
          object: obj1,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeDelete({ namespace, object: obj1 })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj3.type, actionString, true);

      await securityExtension.authorizeDelete({
        namespace,
        object: obj3,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.DELETE]);
      const expectedSpaces = new Set([namespace]);
      const expectedTypes = new Set([obj3.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj3.type, new Set([namespace])); // obj3.existingNamespaces should NOT be included
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          objects: [{ ...obj3, existingNamespaces: [] }],
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj3.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.DELETE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: new Map().set(obj3.type, {
          delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
        auditOptions: {
          objects: [{ ...obj3, existingNamespaces: [] }],
        },
      });
    });

    test(`returns result when successful`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeDelete({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set(obj1.type, {
          delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeDelete({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.DELETE,
          category: ['database'],
          outcome: 'unknown',
          type: ['deletion'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
        },
        message: `User is deleting ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeDelete({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to delete ${obj1.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeDelete({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to delete ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to delete a',
        },
        event: {
          action: AuditAction.DELETE,
          category: ['database'],
          outcome: 'failure',
          type: ['deletion'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
        },
        message: `Failed attempt to delete ${obj1.type} [id=${obj1.id}]`,
      });
    });
  });

  describe(`#authorizeBulkDelete`, () => {
    const actionString = 'bulk_delete';
    const objects = [obj1, obj2, obj3, obj4];
    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_delete', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_delete', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_delete', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:d/bulk_delete', authorized: true },
          { resource: 'bar', privilege: 'mock-saved_object:c/bulk_delete', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:d/bulk_delete', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedTypes = new Set(objects.map((obj) => obj.type));

    const expectedActions = new Set([SecurityAction.BULK_DELETE]);
    const expectedSpaces = new Set([
      namespace,
      ...obj3.existingNamespaces!,
      ...obj4.existingNamespaces!,
    ]);

    const expectedEnforceMap = new Map([
      [obj1.type, new Set([namespace])],
      [obj2.type, new Set([namespace])],
      [obj3.type, new Set([namespace])],
      [obj4.type, new Set([namespace])],
    ]);

    const expectedTypeMap = new Map()
      .set('a', {
        bulk_delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_delete: { authorizedSpaces: ['x'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        bulk_delete: { authorizedSpaces: ['x', 'bar'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('d', {
        bulk_delete: { authorizedSpaces: ['x', 'z'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test('throws an error when `objects` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      const emptyObjects: AuthorizeObjectWithExistingSpaces[] = [];

      await expect(
        securityExtension.authorizeBulkDelete({
          namespace,
          objects: emptyObjects,
        })
      ).rejects.toThrowError('No objects specified for bulk_delete authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkDelete({
          namespace: '',
          objects,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeBulkDelete({ namespace, objects })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeBulkDelete({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          objects,
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${obj1.type}/${actionString}`,
          `mock-saved_object:${obj2.type}/${actionString}`,
          `mock-saved_object:${obj3.type}/${actionString}`,
          `mock-saved_object:${obj4.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.BULK_DELETE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: expectedTypeMap,
        auditOptions: { objects },
      });
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkDelete({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_delete', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_delete', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:c/bulk_delete', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:d/bulk_delete', authorized: true },
            { resource: 'bar', privilege: 'mock-saved_object:c/bulk_delete', authorized: false },
            { resource: 'z', privilege: 'mock-saved_object:d/bulk_delete', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkDelete({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set(obj1.type, {
            bulk_delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj2.type, {
            bulk_delete: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj3.type, {
            bulk_delete: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj4.type, {
            bulk_delete: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkDelete({
        namespace,
        objects,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.DELETE,
            category: ['database'],
            outcome: 'unknown',
            type: ['deletion'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `User is deleting ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_delete', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkDelete({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_delete ${obj2.type},${obj3.type},${obj4.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'bulk_delete', false);

      await expect(
        securityExtension.authorizeBulkDelete({
          namespace,
          objects,
        })
      ).rejects.toThrow(
        `Unable to bulk_delete ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`
      );
      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: `Unable to bulk_delete ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`,
          },
          event: {
            action: AuditAction.DELETE,
            category: ['database'],
            outcome: 'failure',
            type: ['deletion'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `Failed attempt to delete ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe('get', () => {
  const namespace = 'x';

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeGet`, () => {
    const actionString = 'get';

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeGet({
          namespace: '',
          object: obj1,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeGet({ namespace, object: obj1 })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj3.type, actionString, true);

      await securityExtension.authorizeGet({
        namespace,
        object: obj3,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.GET]);
      const expectedSpaces = new Set([namespace, ...obj3.existingNamespaces]);
      const expectedTypes = new Set([obj3.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj3.type, new Set([namespace])); // obj3.existingNamespaces should NOT be included
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          bypass: 'never',
          objects: [obj3],
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj3.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.GET,
        typesAndSpaces: expectedEnforceMap,
        typeMap: new Map().set(obj3.type, {
          get: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
        auditOptions: {
          bypass: 'never',
          objects: [obj3],
        },
      });
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/get', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);
      // setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeGet({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map().set(obj1.type, {
          get: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeGet({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set(obj1.type, {
          get: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeGet({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'unknown',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
        },
        message: `User is accessing ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`adds a single audit event without name when includeSavedObjectNames is false`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup({
        includeSavedObjectNames: false,
      });
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeGet({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'unknown',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `User is accessing ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`does not add an audit event when successful if object is not found`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeGet({
        namespace,
        object: obj1,
        objectNotFound: true,
      });

      expect(auditHelperSpy).not.toHaveBeenCalled();
      expect(addAuditEventSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeGet({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to get ${obj1.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeGet({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to get ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to get a',
        },
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
        },
        message: `Failed attempt to access ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`adds an audit event when unauthorized even if object is not found`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeGet({
          namespace,
          object: { ...obj1, name: undefined },
          objectNotFound: true,
        })
      ).rejects.toThrow(`Unable to get ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to get a',
        },
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj1.type, id: obj1.id, name: undefined },
        },
        message: `Failed attempt to access ${obj1.type} [id=${obj1.id}]`,
      });
    });
  });

  describe(`#authorizeBulkGet`, () => {
    const actionString = 'bulk_get';

    const objA = {
      ...obj1,
      objectNamespaces: [namespace, 'y'], // include multiple spaces
    };
    const objB = { ...obj2, objectNamespaces: ['z'], existingNamespaces: ['y'] }; // use a different namespace than the options namespace;

    const objects = [objA, objB];

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedTypes = new Set(objects.map((obj) => obj.type));
    const expectedActions = new Set([SecurityAction.BULK_GET]);
    const expectedSpaces = new Set([namespace, ...objA.objectNamespaces, ...objB.objectNamespaces]);

    const expectedEnforceMap = new Map([
      [obj1.type, new Set([namespace, ...objA.objectNamespaces])],
      [obj2.type, new Set([namespace, ...objB.objectNamespaces])],
    ]);

    const expectedTypeMap = new Map()
      .set('a', {
        bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_get: {
          authorizedSpaces: ['x', 'y', 'z'],
        },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test('throws an error when `objects` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      const emptyObjects: AuthorizeBulkGetObject[] = [];

      await expect(
        securityExtension.authorizeBulkGet({
          namespace,
          objects: emptyObjects,
        })
      ).rejects.toThrowError('No objects specified for bulk_get authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkGet({
          namespace: '',
          objects,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(securityExtension.authorizeBulkGet({ namespace, objects })).rejects.toThrowError(
        'Oh no!'
      );
    });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeBulkGet({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: { bypass: 'on_success', objects, useSuccessOutcome: true },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${objA.type}/${actionString}`,
          `mock-saved_object:${objB.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.BULK_GET,
        typesAndSpaces: expectedEnforceMap,
        typeMap: expectedTypeMap,
        auditOptions: { bypass: 'on_success', objects, useSuccessOutcome: true },
      });
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkGet({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
            { resource: 'y', privilege: 'mock-saved_object:b/bulk_get', authorized: false },
            { resource: 'z', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkGet({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set(objA.type, {
            bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(objB.type, {
            bulk_get: { authorizedSpaces: ['x', 'z'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkGet({
        namespace,
        objects,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.GET,
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `User has accessed ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`does not add an audit event for objects with an error when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkGet({
        namespace,
        objects: [objA, { ...objB, error: true }],
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'success',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: objA.type, id: objA.id, name: objA.name },
        },
        message: `User has accessed ${objA.type} [id=${objA.id}]`,
      });
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
            { resource: 'y', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
            { resource: 'z', privilege: 'mock-saved_object:b/bulk_get', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkGet({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_get ${objB.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'bulk_delete', false);

      await expect(
        securityExtension.authorizeBulkGet({
          namespace,
          objects: [objA, { ...objB, error: true }], // setting error here to test the case that even err'd objects get an audit on failure
        })
      ).rejects.toThrow(`Unable to bulk_get ${obj1.type},${obj2.type}`);
      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      let i = 1;
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
          error: {
            code: 'Error',
            message: `Unable to bulk_get ${objA.type},${objB.type}`,
          },
          event: {
            action: AuditAction.GET,
            category: ['database'],
            outcome: 'failure',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `Failed attempt to access ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe(`#authorizeCheckConflicts`, () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const namespace = 'x';
  const actionString = 'bulk_create';
  const objects = [obj1, obj2, obj3, obj4];
  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
        { privilege: 'login:', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
        { resource: 'bar', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        { resource: 'z', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set(objects.map((obj) => obj.type));

  const expectedActions = new Set([SecurityAction.CHECK_CONFLICTS]);
  const expectedSpaces = new Set([namespace]);

  const expectedEnforceMap = new Map([
    [obj1.type, new Set([namespace])],
    [obj2.type, new Set([namespace])],
    [obj3.type, new Set([namespace])],
    [obj4.type, new Set([namespace])],
  ]);

  const expectedTypeMap = new Map()
    .set('a', {
      bulk_create: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('b', {
      bulk_create: { authorizedSpaces: ['x'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('c', {
      bulk_create: { authorizedSpaces: ['x', 'bar'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('d', {
      bulk_create: { authorizedSpaces: ['x', 'z'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    });

  test('throws an error when `objects` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    const emptyObjects: AuthorizeObjectWithExistingSpaces[] = [];

    await expect(
      securityExtension.authorizeCheckConflicts({
        namespace,
        objects: emptyObjects,
      })
    ).rejects.toThrowError('No objects specified for bulk_create authorization');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when `namespace` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeCheckConflicts({
        namespace: '',
        objects,
      })
    ).rejects.toThrowError('namespace cannot be an empty string');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeCheckConflicts({ namespace, objects })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    await securityExtension.authorizeCheckConflicts({
      namespace,
      objects,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      auditOptions: { bypass: 'always' },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${obj1.type}/${actionString}`,
        `mock-saved_object:${obj2.type}/${actionString}`,
        `mock-saved_object:${obj3.type}/${actionString}`,
        `mock-saved_object:${obj4.type}/${actionString}`,
        'login:',
      ],
      [...expectedSpaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.CHECK_CONFLICTS,
      typesAndSpaces: expectedEnforceMap,
      typeMap: expectedTypeMap,
      auditOptions: { bypass: 'always' },
    });
  });

  test(`returns result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.authorizeCheckConflicts({
      namespace,
      objects,
    });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: expectedTypeMap,
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`returns result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
          { resource: 'bar', privilege: 'mock-saved_object:c/bulk_create', authorized: false },
          { resource: 'z', privilege: 'mock-saved_object:d/bulk_create', authorized: false },
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.authorizeCheckConflicts({
      namespace,
      objects,
    });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map()
        .set(obj1.type, {
          bulk_create: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set(obj2.type, {
          bulk_create: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set(obj3.type, {
          bulk_create: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set(obj4.type, {
          bulk_create: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`does not add any audit events when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeCheckConflicts({
      namespace,
      objects,
    });

    expect(auditHelperSpy).not.toHaveBeenCalled();
    expect(addAuditEventSpy).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeCheckConflicts({
        namespace,
        objects,
      })
    ).rejects.toThrow(`Unable to bulk_create ${obj2.type},${obj3.type},${obj4.type}`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`does not add any audit events when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'bulk_create', false);

    await expect(
      securityExtension.authorizeCheckConflicts({
        namespace,
        objects,
      })
    ).rejects.toThrow(`Unable to bulk_create ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`);
    expect(auditHelperSpy).not.toHaveBeenCalled();
    expect(addAuditEventSpy).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});

describe(`#authorizeRemoveReferences`, () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const namespace = 'x';
  const actionString = 'delete';
  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/delete', authorized: true },
        { privilege: 'login:', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set([obj1.type]);
  const expectedSpaces = new Set([namespace]);
  const expectedEnforceMap = new Map([[obj1.type, new Set([namespace])]]);

  const expectedTypeMap = new Map().set('a', {
    delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
    ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
  });

  test('throws an error when `namespace` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeRemoveReferences({
        namespace: '',
        object: obj1,
      })
    ).rejects.toThrowError('namespace cannot be an empty string');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeRemoveReferences({ namespace, object: obj1 })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    await securityExtension.authorizeRemoveReferences({
      namespace,
      object: obj1,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: new Set([SecurityAction.REMOVE_REFERENCES]),
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      auditOptions: {
        objects: [obj1],
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
      [...expectedSpaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.REMOVE_REFERENCES,
      typesAndSpaces: expectedEnforceMap,
      typeMap: expectedTypeMap,
      auditOptions: { objects: [obj1] },
    });
  });

  test(`returns result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.authorizeRemoveReferences({
      namespace,
      object: obj1,
    });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: expectedTypeMap,
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`returns result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/delete', authorized: true },
          { privilege: 'login:', authorized: false },
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.authorizeRemoveReferences({
      namespace,
      object: obj1,
    });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map().set(obj1.type, {
        delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
      }),
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds audit event when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeRemoveReferences({
      namespace,
      object: obj1,
    });

    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: AuditAction.REMOVE_REFERENCES,
        category: ['database'],
        outcome: 'unknown',
        type: ['change'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        unauthorized_spaces: undefined,
        unauthorized_types: undefined,
        saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
      },
      message: `User is removing references to ${obj1.type} [id=${obj1.id}]`,
    });
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'delete', false);

    await expect(
      securityExtension.authorizeRemoveReferences({
        namespace,
        object: obj1,
      })
    ).rejects.toThrow(`Unable to delete ${obj1.type}`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds audit event when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'delete', false);

    await expect(
      securityExtension.authorizeRemoveReferences({
        namespace,
        object: obj1,
      })
    ).rejects.toThrow(`Unable to delete ${obj1.type}`);
    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: { code: 'Error', message: `Unable to delete ${obj1.type}` },
      event: {
        action: AuditAction.REMOVE_REFERENCES,
        category: ['database'],
        outcome: 'failure',
        type: ['change'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        unauthorized_spaces: undefined,
        unauthorized_types: undefined,
        saved_object: { type: obj1.type, id: obj1.id, name: obj1.name },
      },
      message: `Failed attempt to remove references to ${obj1.type} [id=${obj1.id}]`,
    });
  });
});

describe(`#authorizeOpenPointInTime`, () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const namespace = 'x';
  const actionString = 'open_point_in_time';
  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/open_point_in_time', authorized: true },
        { privilege: 'mock-saved_object:b/open_point_in_time', authorized: true },
        { privilege: 'mock-saved_object:c/open_point_in_time', authorized: true },
        { privilege: 'login:', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  const multipleSpaces = [namespace, 'foo', 'bar'];
  const multipleTypes = ['a', 'b', 'c'];

  const expectedTypes = new Set(multipleTypes);
  const expectedSpaces = new Set(multipleSpaces);
  const expectedTypeMap = new Map()
    .set('a', {
      open_point_in_time: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('b', {
      open_point_in_time: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('c', {
      open_point_in_time: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    });

  test('throws an error when `namespaces` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: new Set(),
        types: expectedTypes,
      })
    ).rejects.toThrowError('No spaces specified for authorization');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when `types` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: expectedSpaces,
        types: new Set(),
      })
    ).rejects.toThrowError('No types specified for authorization');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: expectedSpaces,
        types: expectedTypes,
      })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and no enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeOpenPointInTime({
      namespaces: expectedSpaces,
      types: expectedTypes,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: new Set([SecurityAction.OPEN_POINT_IN_TIME]),
      types: expectedTypes,
      spaces: expectedSpaces,
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:a/${actionString}`,
        `mock-saved_object:b/${actionString}`,
        `mock-saved_object:c/${actionString}`,
        'login:',
      ],
      multipleSpaces
    );

    expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
  });

  test(`returns result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.authorizeOpenPointInTime({
      namespaces: expectedSpaces,
      types: expectedTypes,
    });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: expectedTypeMap,
    });
    expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
  });

  test(`returns result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/open_point_in_time', authorized: true },
          { privilege: 'login:', authorized: false },
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.authorizeOpenPointInTime({
      namespaces: expectedSpaces,
      types: expectedTypes,
    });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map().set(obj1.type, {
        open_point_in_time: { isGloballyAuthorized: true, authorizedSpaces: [] },
      }),
    });
    expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
  });

  test(`adds audit event when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeOpenPointInTime({
      namespaces: new Set(multipleSpaces),
      types: new Set(multipleTypes),
    });

    expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as open PIT calls the addAudit method directly
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: AuditAction.OPEN_POINT_IN_TIME,
        category: ['database'],
        outcome: 'unknown',
        type: ['creation'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: undefined,
        unauthorized_spaces: undefined,
        unauthorized_types: undefined,
      },
      message: `User is opening point-in-time saved objects`,
    });
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'delete', false);

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: expectedSpaces,
        types: expectedTypes,
      })
    ).rejects.toThrow(`unauthorized`);
  });

  test(`adds audit event when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'open_point_in_time', false);

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: expectedSpaces,
        types: expectedTypes,
      })
    ).rejects.toThrow(`unauthorized`);
    expect(auditHelperSpy).not.toHaveBeenCalled();
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: { code: 'Error', message: `User is unauthorized for any requested types/spaces` },
      event: {
        action: AuditAction.OPEN_POINT_IN_TIME,
        category: ['database'],
        outcome: 'failure',
        type: ['creation'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: undefined,
        unauthorized_spaces: multipleSpaces,
        unauthorized_types: multipleTypes,
      },
      message: `Failed attempt to open point-in-time saved objects`,
    });
  });
});

describe(`#auditClosePointInTime`, () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  test(`adds audit event`, async () => {
    const { securityExtension, auditLogger } = setup();
    securityExtension.auditClosePointInTime();

    expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as close PIT calls the addAudit method directly
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: AuditAction.CLOSE_POINT_IN_TIME,
        category: ['database'],
        outcome: 'unknown',
        type: ['deletion'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: undefined,
      },
      message: `User is closing point-in-time saved objects`,
    });
  });
});

describe('#authorizeAndRedactMultiNamespaceReferences', () => {
  const namespace = 'x';

  const refObj1 = {
    id: 'id-1',
    inboundReferences: [],
    originId: undefined,
    spaces: ['default', 'space-1'],
    spacesWithMatchingAliases: ['space-2', 'space-3', 'space-4'],
    spacesWithMatchingOrigins: undefined,
    type: 'a',
    name: 'name_a',
  };
  const refObj2 = {
    id: 'id-2',
    inboundReferences: [],
    originId: undefined,
    spaces: ['default', 'space-2'],
    spacesWithMatchingAliases: undefined,
    spacesWithMatchingOrigins: ['space-1', 'space-3'],
    type: 'b',
    name: 'name_b',
  };
  const refObj3 = {
    id: 'id-3',
    inboundReferences: [{ id: 'id-1', name: 'ref-name', type: 'a' }],
    originId: undefined,
    spaces: ['default', 'space-1', 'space-4'],
    spacesWithMatchingAliases: undefined,
    spacesWithMatchingOrigins: undefined,
    type: 'c',
    name: 'name_c',
  };
  const objects = [refObj1, refObj2, refObj3];

  const expectedTypes = new Set(objects.map((obj) => obj.type));
  const expectedSpaces = new Set([
    namespace,
    ...refObj1.spaces,
    ...refObj1.spacesWithMatchingAliases,
    ...refObj2.spaces,
    ...refObj2.spacesWithMatchingOrigins,
    ...refObj3.spaces,
  ]);

  const expectedEnforceMap = new Map([
    [refObj1.type, new Set([namespace])],
    [refObj2.type, new Set([namespace])],
    [refObj3.type, new Set([namespace])],
  ]);

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  // NOTE: This comment should inform our test cases...
  // Now, filter/redact the results. Most SOR functions just redact the `namespaces` field from each returned object. However, this function
  // will actually filter the returned object graph itself.
  // This is done in two steps: (1) objects which the user can't access *in this space* are filtered from the graph, and the
  // graph is rearranged to avoid leaking information. (2) any spaces that the user can't access are redacted from each individual object.
  // After we finish filtering, we can write audit events for each object that is going to be returned to the user.

  describe('purpose `collectMultiNamespaceReferences`', () => {
    const actionString = 'bulk_get';

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
          { privilege: 'login:', authorized: true },
          {
            resource: 'x',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-2',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-3',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'x',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-4',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse;

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
          // { privilege: 'login:', authorized: true },
          {
            resource: 'x',
            privilege: 'login:',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'login:',
            authorized: true,
          },
          {
            resource: 'space-2',
            privilege: 'login:',
            authorized: true,
          },
          {
            resource: 'x',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-2',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'x',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse;

    const redactedObjects = [
      {
        ...refObj1,
        name: undefined,
        spaces: ['space-1', '?'],
        spacesWithMatchingAliases: ['space-2', '?', '?'],
      },
      {
        ...refObj2,
        name: undefined,
        spaces: ['space-2', '?'],
        spacesWithMatchingOrigins: ['space-1', '?'],
      },
      { ...refObj3, name: undefined, spaces: ['space-1', '?', '?'] },
    ];
    const expectedActions = new Set([SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES]);

    const fullyAuthorizedTypeMap = new Map()
      .set('a', {
        bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_get: { authorizedSpaces: ['x', 'space-1', 'space-2', 'space-3'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        bulk_get: { authorizedSpaces: ['x', 'space-1', 'space-4'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    const partiallyAuthorizedTypeMap = new Map()
      .set('a', {
        bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { authorizedSpaces: ['x', 'space-1', 'space-2'] },
      })
      .set('b', {
        bulk_get: { authorizedSpaces: ['x', 'space-1', 'space-2'] },
        ['login:']: { authorizedSpaces: ['x', 'space-1', 'space-2'] },
      })
      .set('c', {
        bulk_get: { authorizedSpaces: ['x', 'space-1'] },
        ['login:']: { authorizedSpaces: ['x', 'space-1', 'space-2'] },
      });

    test('returns empty array when no objects are provided`', async () => {
      const { securityExtension } = setup();
      const emptyObjects: SavedObjectReferenceWithContext[] = [];

      const result = await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects: emptyObjects,
      });
      expect(result).toEqual(emptyObjects);
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeAndRedactMultiNamespaceReferences({
          namespace: '',
          objects: [refObj1, refObj2],
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeAndRedactMultiNamespaceReferences({
          namespace,
          objects,
        })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          bypass: 'on_success',
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${refObj1.type}/${actionString}`,
          `mock-saved_object:${refObj2.type}/${actionString}`,
          `mock-saved_object:${refObj3.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(4);
      // Called once with complete enforce map (bypasses audit on success)
      expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(1, {
        action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
        typesAndSpaces: expectedEnforceMap,
        typeMap: partiallyAuthorizedTypeMap,
        auditOptions: { bypass: 'on_success' },
      });
      // Called once per object afterward
      let i = 2;
      for (const obj of objects) {
        expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(i++, {
          action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
          typesAndSpaces: new Map([[obj.type, new Set([namespace])]]),
          typeMap: partiallyAuthorizedTypeMap,
          auditOptions: { bypass: 'always' },
        });
      }
    });

    test(`returns unredacted result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      const result = await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
      });

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(4);
      expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(1, {
        action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
        typesAndSpaces: expectedEnforceMap,
        typeMap: fullyAuthorizedTypeMap,
        auditOptions: { bypass: 'on_success' },
      });
      let i = 2;
      for (const obj of objects) {
        expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(i++, {
          action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
          typesAndSpaces: new Map([[obj.type, new Set([namespace])]]),
          typeMap: fullyAuthorizedTypeMap,
          auditOptions: { bypass: 'always' },
        });
      }

      // name should be always redacted
      expect(result).toEqual(objects.map(({ name, ...obj }) => obj));
    });

    test(`returns redacted result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      const result = await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
      });
      expect(redactNamespacesSpy).toHaveBeenCalledTimes(5); // spaces x3, spaces of aliases x1, spaces of origins x1
      expect(result).toEqual(redactedObjects);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
      });

      // the audit helper is not called during this action
      // the addAuditEvent method is called directly
      expect(auditHelperSpy).not.toHaveBeenCalled();
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      let i = 1;
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
          error: undefined,
          event: {
            action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id, name: obj.name },
          },
          message: `User has collected references and spaces of ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeAndRedactMultiNamespaceReferences({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_get ${refObj2.type},${refObj3.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [{ privilege: 'login:', authorized: true }],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeAndRedactMultiNamespaceReferences({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_get ${refObj1.type},${refObj2.type},${refObj3.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);

      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: `Unable to bulk_get ${refObj1.type},${refObj2.type},${refObj3.type}`,
        },
        event: {
          action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: undefined,
        },
        message: `Failed attempt to collect references and spaces of saved objects`,
      });
    });
  });

  describe('purpose `updateObjectsSpaces`', () => {
    const actionString = 'share_to_space';
    const purpose = 'updateObjectsSpaces';

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
          {
            resource: 'x',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-2',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-3',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'x',
            privilege: 'mock-saved_object:c/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:c/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-4',
            privilege: 'mock-saved_object:c/share_to_space',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedActions = new Set([
      SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
    ]);

    const fullyAuthorizedTypeMap = new Map()
      .set('a', {
        share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        share_to_space: { authorizedSpaces: ['x', 'space-1', 'space-2', 'space-3'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        share_to_space: { authorizedSpaces: ['x', 'space-1', 'space-4'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
        options: { purpose },
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          bypass: 'on_success',
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${refObj1.type}/${actionString}`,
          `mock-saved_object:${refObj2.type}/${actionString}`,
          `mock-saved_object:${refObj3.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(4);
      // Called once with complete enforce map (bypasses audit on success)
      expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(1, {
        action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
        typesAndSpaces: expectedEnforceMap,
        typeMap: fullyAuthorizedTypeMap,
        auditOptions: { bypass: 'on_success' },
      });
      // Called once per object afterward
      let i = 2;
      for (const obj of objects) {
        expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(i++, {
          action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
          typesAndSpaces: new Map([[obj.type, new Set([namespace])]]),
          typeMap: fullyAuthorizedTypeMap,
          auditOptions: { bypass: 'always' },
        });
      }
    });
  });
});

describe('#authorizeAndRedactInternalBulkResolve', () => {
  const namespace = 'x';

  const resolveObj1: SavedObjectsResolveResponse<unknown> = {
    outcome: 'exactMatch',
    saved_object: {
      attributes: {},
      id: '13',
      namespaces: ['foo'],
      references: [],
      type: 'a',
    },
  };
  const resolveObj2: SavedObjectsResolveResponse<unknown> = {
    outcome: 'exactMatch',
    saved_object: {
      attributes: {},
      id: '14',
      namespaces: ['bar'],
      references: [],
      type: 'b',
    },
  };

  const objects = [resolveObj1, resolveObj2];

  const expectedTypes = new Set(objects.map((obj) => obj.saved_object.type));
  const expectedSpaces = new Set(['foo', 'bar', namespace]);

  const expectedEnforceMap = new Map([
    [resolveObj1.saved_object.type, new Set([namespace])],
    [resolveObj2.saved_object.type, new Set([namespace])],
  ]);

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const actionString = 'bulk_get';

  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
        { privilege: 'login:', authorized: true },
        {
          resource: 'x',
          privilege: 'mock-saved_object:b/bulk_get',
          authorized: true,
        },
        {
          resource: 'bar',
          privilege: 'mock-saved_object:b/bulk_get',
          authorized: true,
        },
      ],
    },
  } as CheckPrivilegesResponse;

  const partiallyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: false,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
        {
          resource: 'x',
          privilege: 'login:',
          authorized: true,
        },
        {
          resource: 'foo',
          privilege: 'login:',
          authorized: true,
        },
        {
          resource: 'x',
          privilege: 'mock-saved_object:b/bulk_get',
          authorized: true,
        },
        {
          resource: 'bar',
          privilege: 'mock-saved_object:b/bulk_get',
          authorized: true,
        },
      ],
    },
  } as CheckPrivilegesResponse;

  const redactedObjects = [
    resolveObj1,
    { ...resolveObj2, saved_object: { ...resolveObj2.saved_object, namespaces: ['?'] } },
  ];
  const expectedActions = new Set([SecurityAction.INTERNAL_BULK_RESOLVE]);

  const fullyAuthorizedTypeMap = new Map()
    .set('a', {
      bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('b', {
      bulk_get: { authorizedSpaces: ['x', 'bar'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    });

  const partiallyAuthorizedTypeMap = new Map()
    .set('a', {
      bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { authorizedSpaces: ['x', 'foo'] },
    })
    .set('b', {
      bulk_get: { authorizedSpaces: ['x', 'bar'] },
      ['login:']: { authorizedSpaces: ['x', 'foo'] },
    });

  const auditObjects = objects.map((obj) => {
    return {
      type: obj.saved_object.type,
      id: obj.saved_object.id,
    };
  });

  test('returns empty array when no objects are provided`', async () => {
    const { securityExtension } = setup();
    const emptyObjects: Array<SavedObjectsResolveResponse<unknown> | BulkResolveError> = [];

    const result = await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects: emptyObjects,
    });
    expect(result).toEqual(emptyObjects);
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeAndRedactInternalBulkResolve({
        namespace,
        objects,
      })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      auditOptions: {
        objects: auditObjects,
        useSuccessOutcome: true,
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${resolveObj1.saved_object.type}/${actionString}`,
        `mock-saved_object:${resolveObj2.saved_object.type}/${actionString}`,
        'login:',
      ],
      expect.arrayContaining([...expectedSpaces])
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.INTERNAL_BULK_RESOLVE,
      typesAndSpaces: expectedEnforceMap,
      typeMap: partiallyAuthorizedTypeMap,
      auditOptions: { objects: auditObjects, useSuccessOutcome: true },
    });
  });

  test(`returns unredacted result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    const result = await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects,
    });

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.INTERNAL_BULK_RESOLVE,
      typesAndSpaces: expectedEnforceMap,
      typeMap: fullyAuthorizedTypeMap,
      auditOptions: { objects: auditObjects, useSuccessOutcome: true },
    });
    expect(result).toEqual(objects);
  });

  test(`returns redacted result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    const result = await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects,
    });
    expect(redactNamespacesSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual(redactedObjects);
  });

  test(`adds an audit event when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects,
    });

    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(auditHelperSpy).toHaveBeenCalledWith({
      action: 'saved_object_resolve',
      addToSpaces: undefined,
      deleteFromSpaces: undefined,
      objects: auditObjects,
      useSuccessOutcome: true,
    });
    expect(addAuditEventSpy).toHaveBeenCalledTimes(auditObjects.length);
    let i = 1;
    for (const auditObj of auditObjects) {
      expect(addAuditEventSpy).toHaveBeenNthCalledWith(i++, {
        action: 'saved_object_resolve',
        addToSpaces: undefined,
        deleteFromSpaces: undefined,
        unauthorizedSpaces: undefined,
        unauthorizedTypes: undefined,
        error: undefined,
        outcome: 'success',
        savedObject: auditObj,
      });
    }
    expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length);
    i = 1;
    for (const auditObj of auditObjects) {
      expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
        error: undefined,
        event: {
          action: AuditAction.RESOLVE,
          category: ['database'],
          outcome: 'success',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: auditObj,
        },
        message: `User has resolved ${auditObj.type} [id=${auditObj.id}]`,
      });
    }
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeAndRedactInternalBulkResolve({
        namespace,
        objects,
      })
    ).rejects.toThrow(`Unable to bulk_get ${resolveObj2.saved_object.type}`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds an audit event when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [{ privilege: 'login:', authorized: true }],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeAndRedactInternalBulkResolve({
        namespace,
        objects,
      })
    ).rejects.toThrow(
      `Unable to bulk_get ${resolveObj1.saved_object.type},${resolveObj2.saved_object.type}`
    );
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);

    expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
    expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
    let i = 1;
    for (const auditObj of auditObjects) {
      expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
        error: {
          code: 'Error',
          message: `Unable to bulk_get ${resolveObj1.saved_object.type},${resolveObj2.saved_object.type}`,
        },
        event: {
          action: AuditAction.RESOLVE,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: auditObj,
        },
        message: `Failed attempt to resolve ${auditObj.type} [id=${auditObj.id}]`,
      });
    }
  });
});

describe('#authorizeUpdateSpaces', () => {
  const namespace = 'x';

  const multiSpaceObj1 = {
    type: 'a',
    id: '1',
    existingNamespaces: ['add_space_1', 'add_space_2'],
    name: 'a_object_name',
  };
  const multiSpaceObj2 = {
    type: 'b',
    id: '2',
    existingNamespaces: ['*'],
    name: 'b_object_name',
  };
  const multiSpaceObj3 = {
    type: 'a',
    id: '3',
    existingNamespaces: ['rem_space_2', 'add_space_2'],
    name: 'a_object_name',
  };
  const multiSpaceObj4 = {
    type: 'b',
    id: '4',
    existingNamespaces: ['foo', 'add_space_1'],
    name: 'b_object_name',
  };

  const objects = [multiSpaceObj1, multiSpaceObj2, multiSpaceObj3, multiSpaceObj4];

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const actionString = 'share_to_space';

  const spacesToAdd = ['add_space_1', 'add_space_2'];
  const spacesToRemove = ['rem_space_1', 'rem_space_2'];

  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
        { privilege: 'login:', authorized: true },
        {
          resource: 'x',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
        {
          resource: 'add_space_1',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
        {
          resource: 'add_space_2',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
        {
          resource: 'rem_space_1',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
        {
          resource: 'rem_space_2',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set(objects.map((obj) => obj.type));

  const expectedActions = new Set([SecurityAction.UPDATE_OBJECTS_SPACES]);
  const expectedSpaces = new Set([...spacesToAdd, ...spacesToRemove, namespace, 'foo']);

  const expectedEnforceMap = new Map([
    [multiSpaceObj1.type, new Set([...spacesToAdd, ...spacesToRemove, namespace])],
    [multiSpaceObj2.type, new Set([...spacesToAdd, ...spacesToRemove, namespace])],
  ]);

  const expectedTypeMap = new Map()
    .set('a', {
      share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('b', {
      share_to_space: { authorizedSpaces: ['x', ...spacesToAdd, ...spacesToRemove] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    });

  test('throws an error when `objects` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    const emptyObjects: AuthorizeObjectWithExistingSpaces[] = [];

    await expect(
      securityExtension.authorizeUpdateSpaces({
        namespace,
        spacesToAdd,
        spacesToRemove,
        objects: emptyObjects,
      })
    ).rejects.toThrowError('No objects specified for share_to_space authorization');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when `namespace` is an empty string', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeUpdateSpaces({
        namespace: '',
        spacesToAdd,
        spacesToRemove,
        objects,
      })
    ).rejects.toThrowError('namespace cannot be an empty string');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeUpdateSpaces({ namespace, spacesToAdd, spacesToRemove, objects })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove,
      objects,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      options: { allowGlobalResource: true },
      auditOptions: {
        objects,
        addToSpaces: spacesToAdd,
        deleteFromSpaces: spacesToRemove,
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: true },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${multiSpaceObj1.type}/${actionString}`,
        `mock-saved_object:${multiSpaceObj2.type}/${actionString}`,
        'login:',
      ],
      [...expectedSpaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.UPDATE_OBJECTS_SPACES,
      typesAndSpaces: expectedEnforceMap,
      typeMap: expectedTypeMap,
      auditOptions: { objects, addToSpaces: spacesToAdd, deleteFromSpaces: spacesToRemove },
    });
  });

  test(`calls authorize methods with '*' when spacesToAdd includes '*'`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'mock-saved_object:b/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd: ['*'],
      spacesToRemove,
      objects,
    });

    const spaces = new Set(['*', ...spacesToRemove, 'x', 'add_space_1', 'add_space_2', 'foo']);
    const enforceMap = new Map([
      [multiSpaceObj1.type, new Set(['*', ...spacesToRemove, namespace])],
      [multiSpaceObj2.type, new Set(['*', ...spacesToRemove, namespace])],
    ]);

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces,
      enforceMap,
      options: { allowGlobalResource: true },
      auditOptions: {
        objects,
        addToSpaces: ['*'],
        deleteFromSpaces: spacesToRemove,
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces,
      types: expectedTypes,
      options: { allowGlobalResource: true },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${multiSpaceObj1.type}/${actionString}`,
        `mock-saved_object:${multiSpaceObj2.type}/${actionString}`,
        'login:',
      ],
      [...spaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.UPDATE_OBJECTS_SPACES,
      typesAndSpaces: enforceMap,
      typeMap: new Map()
        .set('a', {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      auditOptions: { objects, addToSpaces: ['*'], deleteFromSpaces: spacesToRemove },
    });
  });

  test(`calls authorize methods with '*' when spacesToRemove includes '*'`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'mock-saved_object:b/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove: ['*'],
      objects,
    });

    const spaces = new Set([...spacesToAdd, '*', 'x', 'rem_space_2', 'foo']);
    const enforceMap = new Map([
      [multiSpaceObj1.type, new Set([...spacesToAdd, '*', namespace])],
      [multiSpaceObj2.type, new Set([...spacesToAdd, '*', namespace])],
    ]);

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces,
      enforceMap,
      options: { allowGlobalResource: true },
      auditOptions: {
        objects,
        addToSpaces: spacesToAdd,
        deleteFromSpaces: ['*'],
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces,
      types: expectedTypes,
      options: { allowGlobalResource: true },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${multiSpaceObj1.type}/${actionString}`,
        `mock-saved_object:${multiSpaceObj2.type}/${actionString}`,
        'login:',
      ],
      [...spaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.UPDATE_OBJECTS_SPACES,
      typesAndSpaces: enforceMap,
      typeMap: new Map()
        .set('a', {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      auditOptions: { objects, addToSpaces: spacesToAdd, deleteFromSpaces: ['*'] },
    });
  });

  test(`returns result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove,
      objects,
    });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: expectedTypeMap,
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`returns result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
          {
            resource: 'x',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'foo',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: false,
          },
          {
            resource: 'add_space_1',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'add_space_2',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'rem_space_1',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'rem_space_2',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove,
      objects,
    });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map()
        .set(multiSpaceObj1.type, {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set(multiSpaceObj2.type, {
          share_to_space: { authorizedSpaces: ['x', ...spacesToAdd, ...spacesToRemove] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds an audit event per object when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove,
      objects,
    });

    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
    expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
    let i = 1;
    for (const obj of objects) {
      expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
        error: undefined,
        event: {
          action: AuditAction.UPDATE_OBJECTS_SPACES,
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: spacesToAdd,
          delete_from_spaces: spacesToRemove,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj.type, id: obj.id, name: obj.name },
        },
        message: `User is updating spaces of ${obj.type} [id=${obj.id}]`,
      });
    }
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeUpdateSpaces({
        namespace,
        spacesToAdd,
        spacesToRemove,
        objects,
      })
    ).rejects.toThrow(`Unable to share_to_space ${multiSpaceObj2.type}`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds an audit event per object when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: false },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeUpdateSpaces({
        namespace,
        spacesToAdd,
        spacesToRemove,
        objects,
      })
    ).rejects.toThrow(`Unable to share_to_space ${multiSpaceObj1.type},${multiSpaceObj2.type}`);
    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
    expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
    let i = 1;
    for (const obj of objects) {
      expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
        error: {
          code: 'Error',
          message: `Unable to share_to_space ${multiSpaceObj1.type},${multiSpaceObj2.type}`,
        },
        event: {
          action: AuditAction.UPDATE_OBJECTS_SPACES,
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: spacesToAdd,
          delete_from_spaces: spacesToRemove,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: obj.type, id: obj.id, name: obj.name },
        },
        message: `Failed attempt to update spaces of ${obj.type} [id=${obj.id}]`,
      });
    }
  });
});

describe('find', () => {
  const namespace = 'x';
  const actionString = 'find';
  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/find', authorized: true },
        { privilege: 'login:', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set([obj1.type]);
  const expectedSpaces = new Set([namespace]);
  const expectedTypeMap = new Map().set('a', {
    find: { isGloballyAuthorized: true, authorizedSpaces: [] },
    ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
  });

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeFind`, () => {
    test('throws an error when `namespaces` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeFind({
          namespaces: new Set(),
          types: expectedTypes,
        })
      ).rejects.toThrowError('No spaces specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `types` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeFind({
          namespaces: expectedSpaces,
          types: new Set(),
        })
      ).rejects.toThrowError('No types specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeFind({ namespaces: expectedSpaces, types: expectedTypes })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and no enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: new Set([SecurityAction.FIND]),
        types: expectedTypes,
        spaces: expectedSpaces,
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/find', authorized: true },
            { privilege: 'login:', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map().set(obj1.type, {
          find: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test(`does not add audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });

      expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as authorizeFind calls the addAudit method directly
      expect(addAuditEventSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    test(`returns result when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', false);

      const result = await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });
      expect(result).toEqual({
        status: 'unauthorized',
        typeMap: new Map().set(obj1.type, {
          'login:': { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test(`adds audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', false);

      await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });
      expect(auditHelperSpy).not.toHaveBeenCalled();
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: { code: 'Error', message: `User is unauthorized for any requested types/spaces` },
        event: {
          action: AuditAction.FIND,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: undefined,
          unauthorized_spaces: [namespace],
          unauthorized_types: [obj1.type],
        },
        message: `Failed attempt to access saved objects`,
      });
    });
  });

  describe(`#getFindRedactTypeMap`, () => {
    const existingNamespaces = [namespace, 'y', 'z', 'foo'];
    const objects = [
      { type: obj1.type, id: obj1.id, existingNamespaces: [namespace, 'y'] },
      { type: obj1.type, id: obj2.id, existingNamespaces: [namespace, 'z'] },
      { type: obj1.type, id: obj3.id, existingNamespaces: [namespace, 'foo'] },
    ];

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:a/find', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:a/find', authorized: false },
          { resource: 'z', privilege: 'mock-saved_object:a/find', authorized: true },
          { resource: 'foo', privilege: 'mock-saved_object:a/find', authorized: false },
        ],
      },
    } as CheckPrivilegesResponse;

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.getFindRedactTypeMap({
          previouslyCheckedNamespaces: expectedSpaces,
          objects: [{ type: obj1.type, id: obj1.id, existingNamespaces }],
        })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and no enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.getFindRedactTypeMap({
        previouslyCheckedNamespaces: expectedSpaces,
        objects,
      });

      const updateExpectedSpaces = new Set(existingNamespaces);

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: new Set([SecurityAction.FIND]),
        types: expectedTypes,
        spaces: updateExpectedSpaces,
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: updateExpectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
        [...updateExpectedSpaces]
      );

      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test('returns undefined if there are no additional spaces', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.getFindRedactTypeMap({
        previouslyCheckedNamespaces: expectedSpaces,
        objects: [{ type: obj1.type, id: obj1.id, existingNamespaces: [namespace] }],
      });
      expect(result).toBeUndefined();
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.getFindRedactTypeMap({
        previouslyCheckedNamespaces: expectedSpaces,
        objects,
      });

      expect(result).toEqual(expectedTypeMap);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.getFindRedactTypeMap({
        previouslyCheckedNamespaces: expectedSpaces,
        objects,
      });

      expect(result).toEqual(
        new Map().set('a', {
          find: { authorizedSpaces: ['x', 'z'] },
          'login:': { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
      );
    });

    test(`returns result when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', false);

      const result = await securityExtension.getFindRedactTypeMap({
        previouslyCheckedNamespaces: expectedSpaces,
        objects,
      });

      expect(result).toEqual(
        new Map().set(obj1.type, {
          'login:': { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
      );
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', false);

      await securityExtension.getFindRedactTypeMap({
        previouslyCheckedNamespaces: expectedSpaces,
        objects,
      });

      expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as getFindRedactTypeMap calls the addAudit method directly
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.FIND,
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User has accessed ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`adds an audit event per object when authorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', true);

      await securityExtension.getFindRedactTypeMap({
        previouslyCheckedNamespaces: expectedSpaces,
        objects,
      });

      expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as getFindRedactTypeMap calls the addAudit method directly
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.FIND,
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            unauthorized_spaces: undefined,
            unauthorized_types: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User has accessed ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe('#authorizeDisableLegacyUrlAliases', () => {
  const legacyUrlAlias1: LegacyUrlAliasTarget = {
    targetType: 'a',
    targetSpace: 'x',
    sourceId: 'id1',
  };
  const legacyUrlAlias2: LegacyUrlAliasTarget = {
    targetType: 'b',
    targetSpace: 'y',
    sourceId: 'id2',
  };
  const legacyUrlAlias3: LegacyUrlAliasTarget = {
    targetType: 'c',
    targetSpace: 'z',
    sourceId: 'id3',
  };
  const legacyUrlAliases: LegacyUrlAliasTarget[] = [
    legacyUrlAlias1,
    legacyUrlAlias2,
    legacyUrlAlias3,
  ];

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const actionString = 'bulk_update';

  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
        { privilege: 'login:', authorized: true },
        {
          resource: 'y',
          privilege: 'mock-saved_object:b/bulk_update',
          authorized: true,
        },
        {
          resource: 'z',
          privilege: 'mock-saved_object:c/bulk_update',
          authorized: true,
        },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set(legacyUrlAliases.map((alias) => alias.targetType));
  const expectedActions = new Set([SecurityAction.BULK_UPDATE]);
  const expectedSpaces = new Set(legacyUrlAliases.map((alias) => alias.targetSpace));

  const expectedEnforceMap = new Map([
    [legacyUrlAlias1.targetType, new Set([legacyUrlAlias1.targetSpace])],
    [legacyUrlAlias2.targetType, new Set([legacyUrlAlias2.targetSpace])],
    [legacyUrlAlias3.targetType, new Set([legacyUrlAlias3.targetSpace])],
  ]);

  const auditObjects = legacyUrlAliases.map((alias) => {
    return {
      type: 'legacy-url-alias',
      id: `${alias.targetSpace}:${alias.targetType}:${alias.sourceId}`,
    };
  });

  const expectedTypeMap = new Map()
    .set('a', {
      bulk_update: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('b', {
      bulk_update: { authorizedSpaces: ['y'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('c', {
      bulk_update: { authorizedSpaces: ['z'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    });

  test('throws an error when `aliases` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    await expect(securityExtension.authorizeDisableLegacyUrlAliases([])).rejects.toThrowError(
      'No aliases specified for authorization'
    );
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeDisableLegacyUrlAliases(legacyUrlAliases)
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeDisableLegacyUrlAliases(legacyUrlAliases);

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      auditOptions: { objects: auditObjects },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${legacyUrlAlias1.targetType}/${actionString}`,
        `mock-saved_object:${legacyUrlAlias2.targetType}/${actionString}`,
        `mock-saved_object:${legacyUrlAlias3.targetType}/${actionString}`,
        'login:',
      ],
      [...expectedSpaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.BULK_UPDATE,
      typesAndSpaces: expectedEnforceMap,
      typeMap: expectedTypeMap,
      auditOptions: { objects: auditObjects },
    });
  });

  test(`returns when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeDisableLegacyUrlAliases(legacyUrlAliases)
    ).resolves.toBe(undefined);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`returns when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
          { privilege: 'login:', authorized: false },
          {
            resource: 'y',
            privilege: 'mock-saved_object:b/bulk_update',
            authorized: true,
          },
          {
            resource: 'z',
            privilege: 'mock-saved_object:c/bulk_update',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeDisableLegacyUrlAliases(legacyUrlAliases)
    ).resolves.toBe(undefined);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds an audit event per object when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeDisableLegacyUrlAliases(legacyUrlAliases);

    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(legacyUrlAliases.length);
    expect(auditLogger.log).toHaveBeenCalledTimes(legacyUrlAliases.length);
    let i = 1;
    for (const alias of legacyUrlAliases) {
      const legacyObjectId = `${alias.targetSpace}:${alias.targetType}:${alias.sourceId}`;
      expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
        error: undefined,
        event: {
          action: AuditAction.UPDATE,
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: 'legacy-url-alias', id: legacyObjectId },
        },
        message: `User is updating legacy-url-alias [id=${legacyObjectId}]`,
      });
    }
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, 'a', 'bulk_update', false);

    await expect(
      securityExtension.authorizeDisableLegacyUrlAliases(legacyUrlAliases)
    ).rejects.toThrow(`Unable to bulk_update a,b,c`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds an audit event per object when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: false },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeDisableLegacyUrlAliases(legacyUrlAliases)
    ).rejects.toThrow(`Unable to bulk_update a,b,c`);

    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(legacyUrlAliases.length);
    expect(auditLogger.log).toHaveBeenCalledTimes(legacyUrlAliases.length);
    let i = 1;
    for (const alias of legacyUrlAliases) {
      const legacyObjectId = `${alias.targetSpace}:${alias.targetType}:${alias.sourceId}`;
      expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
        error: {
          code: 'Error',
          message: 'Unable to bulk_update a,b,c',
        },
        event: {
          action: AuditAction.UPDATE,
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          unauthorized_spaces: undefined,
          unauthorized_types: undefined,
          saved_object: { type: 'legacy-url-alias', id: legacyObjectId },
        },
        message: `Failed attempt to update legacy-url-alias [id=${legacyObjectId}]`,
      });
    }
  });
});

describe(`#auditObjectsForSpaceDeletion`, () => {
  const spaceId = 'x';

  const objects: Array<SavedObjectsFindResult<unknown>> = [
    {
      id: '1',
      namespaces: ['*'],
      type: 'dashboard',
      score: 1,
      attributes: undefined,
      references: [],
    },
    {
      id: '2',
      namespaces: ['x'],
      type: 'dashboard',
      score: 1,
      attributes: undefined,
      references: [],
    },
    {
      id: '3',
      namespaces: ['default', 'x'],
      type: 'dashboard',
      score: 1,
      attributes: undefined,
      references: [],
    },
  ];

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  test(`adds audit event for each object without '*' in namespaces`, async () => {
    const { securityExtension, auditLogger } = setup();
    securityExtension.auditObjectsForSpaceDeletion(spaceId, objects);

    expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, the addAudit method is called directly
    expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length - 1);
    expect(auditLogger.log).toHaveBeenCalledTimes(objects.length - 1);

    // The first object's namespaces includes '*', so there will not be an audit for it

    // The second object only exists in the space we're deleting, so it is audited as a delete
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      error: undefined,
      event: {
        action: AuditAction.DELETE,
        category: ['database'],
        outcome: 'unknown',
        type: ['deletion'],
      },
      kibana: {
        delete_from_spaces: undefined,
        saved_object: { type: objects[1].type, id: objects[1].id },
      },
      message: `User is deleting dashboard [id=${objects[1].id}]`,
    });

    // The third object exists in spaces other than what we're deleting, so it is audited as a change
    expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
      error: undefined,
      event: {
        action: AuditAction.UPDATE_OBJECTS_SPACES,
        category: ['database'],
        outcome: 'unknown',
        type: ['change'],
      },
      kibana: {
        delete_from_spaces: [spaceId],
        saved_object: { type: objects[2].type, id: objects[2].id },
      },
      message: `User is updating spaces of dashboard [id=${objects[2].id}]`,
    });
  });
});
