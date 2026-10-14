/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { ActionsAuthorization } from './actions_authorization';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';

const request = {} as KibanaRequest;

const mockAuthorizationAction = (type: string, operation: string) => `${type}/${operation}`;

function mockSecurity() {
  const security = securityMock.createSetup();
  const authorization = security.authz;
  // typescript is having trouble inferring jest's automocking
  (
    authorization.actions.savedObject.get as jest.MockedFunction<
      typeof authorization.actions.savedObject.get
    >
  ).mockImplementation(mockAuthorizationAction);
  authorization.mode.useRbacForRequest.mockReturnValue(true);
  return { authorization };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('ensureAuthorized', () => {
  test('is a no-op when there is no authorization api', async () => {
    const actionsAuthorization = new ActionsAuthorization({
      request,
    });

    await actionsAuthorization.ensureAuthorized({ operation: 'create', actionTypeId: 'myType' });
  });

  test('is a no-op when the security license is disabled', async () => {
    const { authorization } = mockSecurity();
    authorization.mode.useRbacForRequest.mockReturnValue(false);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    await actionsAuthorization.ensureAuthorized({ operation: 'create', actionTypeId: 'myType' });
  });

  test('ensures the user has privileges to use the operation on the Actions Saved Object type', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'create'),
          authorized: true,
        },
      ],
    });

    await actionsAuthorization.ensureAuthorized({ operation: 'create', actionTypeId: 'myType' });

    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith('action', 'create');
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [mockAuthorizationAction('action', 'create')],
    });
  });

  test('ensures the user has privileges to execute an Actions Saved Object type', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'execute'),
          authorized: true,
        },
      ],
    });

    await actionsAuthorization.ensureAuthorized({ operation: 'execute', actionTypeId: 'myType' });

    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith(
      ACTION_SAVED_OBJECT_TYPE,
      'get'
    );
    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith(
      ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      'create'
    );
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [
        mockAuthorizationAction(ACTION_SAVED_OBJECT_TYPE, 'get'),
        mockAuthorizationAction(ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE, 'create'),
      ],
    });
  });

  test('throws if user lacks the required privieleges', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'create'),
          authorized: false,
        },
        {
          privilege: mockAuthorizationAction('myOtherType', 'create'),
          authorized: true,
        },
      ],
    });

    await expect(
      actionsAuthorization.ensureAuthorized({ operation: 'create', actionTypeId: 'myType' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unauthorized to create a \\"myType\\" action"`);
  });

  test('checks additional privileges correctly', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();

    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'execute'),
          authorized: true,
        },
      ],
    });

    await actionsAuthorization.ensureAuthorized({
      operation: 'execute',
      actionTypeId: 'myType',
      additionalPrivileges: ['test/create'],
    });

    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith(
      ACTION_SAVED_OBJECT_TYPE,
      'get'
    );

    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith(
      ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      'create'
    );

    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [
        mockAuthorizationAction(ACTION_SAVED_OBJECT_TYPE, 'get'),
        mockAuthorizationAction(ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE, 'create'),
        'test/create',
      ],
    });
  });
});

describe('getFindAuthorizationFilter', () => {
  const getPrivilege = mockAuthorizationAction(ACTION_SAVED_OBJECT_TYPE, 'get');

  test('filters to the requested spaces without checking privileges when there is no authorization api', async () => {
    const actionsAuthorization = new ActionsAuthorization({
      request,
    });

    await expect(
      actionsAuthorization.getFindAuthorizationFilter({
        namespaces: ['space-1'],
      })
    ).resolves.toEqual({
      filter: nodeBuilder.is('kibana.space_ids', 'space-1'),
    });
  });

  test('filters to the requested spaces without checking privileges when the security license is disabled', async () => {
    const { authorization } = mockSecurity();
    authorization.mode.useRbacForRequest.mockReturnValue(false);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    await expect(
      actionsAuthorization.getFindAuthorizationFilter({ namespaces: ['space-1'] })
    ).resolves.toEqual({
      filter: nodeBuilder.is('kibana.space_ids', 'space-1'),
    });
    expect(authorization.checkPrivilegesWithRequest).not.toHaveBeenCalled();
  });

  test('checks the get privilege in every requested space', async () => {
    const { authorization } = mockSecurity();
    const atSpaces = jest.fn().mockResolvedValue({
      username: 'some-user',
      hasAllRequested: true,
      privileges: {
        kibana: [
          { resource: 'space-1', privilege: getPrivilege, authorized: true },
          { resource: 'default', privilege: getPrivilege, authorized: true },
        ],
      },
    });
    authorization.checkPrivilegesWithRequest.mockReturnValue({ atSpaces });
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    await expect(
      actionsAuthorization.getFindAuthorizationFilter({
        namespaces: ['space-1', undefined],
      })
    ).resolves.toEqual({
      filter: nodeBuilder.or([
        nodeBuilder.is('kibana.space_ids', 'space-1'),
        nodeBuilder.is('kibana.space_ids', 'default'),
      ]),
    });

    expect(atSpaces).toHaveBeenCalledWith(['space-1', 'default'], {
      kibana: [getPrivilege],
    });
  });

  test('throws when at least one requested space lacks the get privilege', async () => {
    const { authorization } = mockSecurity();
    const atSpaces = jest.fn().mockResolvedValue({
      username: 'some-user',
      hasAllRequested: false,
      privileges: {
        kibana: [
          { resource: 'space-1', privilege: getPrivilege, authorized: false },
          { resource: 'default', privilege: getPrivilege, authorized: true },
        ],
      },
    });
    authorization.checkPrivilegesWithRequest.mockReturnValue({ atSpaces });
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    await expect(
      actionsAuthorization.getFindAuthorizationFilter({
        namespaces: ['space-1', undefined],
      })
    ).rejects.toThrow(
      'Unauthorized to get actions. Validate that you have permissions to access spaces: space-1.'
    );
  });

  test('filters to current space when namespaces are omitted', async () => {
    const { authorization } = mockSecurity();
    const atSpaces = jest.fn().mockResolvedValue({
      username: 'some-user',
      hasAllRequested: true,
      privileges: {
        kibana: [
          { resource: 'space-1', privilege: getPrivilege, authorized: true },
          { resource: 'default', privilege: 'login', authorized: true },
        ],
      },
    });
    authorization.checkPrivilegesWithRequest.mockReturnValue({ atSpaces });
    const actionsAuthorization = new ActionsAuthorization({
      request: { ...request, spaceId: 'space-1' } as KibanaRequest,
      authorization,
    });

    await expect(actionsAuthorization.getFindAuthorizationFilter({})).resolves.toEqual({
      filter: nodeBuilder.is('kibana.space_ids', 'space-1'),
    });

    expect(atSpaces).toHaveBeenCalledWith(['space-1'], {
      kibana: [getPrivilege],
    });
  });

  test('throws when namespaces are omitted and no space is authorized', async () => {
    const { authorization } = mockSecurity();
    const atSpaces = jest.fn().mockResolvedValue({
      username: 'some-user',
      hasAllRequested: false,
      privileges: {
        kibana: [],
      },
    });
    authorization.checkPrivilegesWithRequest.mockReturnValue({ atSpaces });
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    await expect(actionsAuthorization.getFindAuthorizationFilter({})).rejects.toThrow(
      'Unauthorized to get actions.'
    );
  });
});
