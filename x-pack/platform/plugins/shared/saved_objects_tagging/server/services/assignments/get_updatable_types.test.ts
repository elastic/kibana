/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { getUpdatableSavedObjectTypes } from './get_updatable_types';

describe('getUpdatableSavedObjectTypes', () => {
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let authorization: ReturnType<typeof securityMock.createSetup>['authz'];

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    authorization = securityMock.createSetup().authz;
    // the mock's `savedObject.get` is auto-mocked to always return `undefined`; give it the
    // real implementation's shape so tests can distinguish privileges by type/action.
    (authorization.actions.savedObject.get as jest.Mock).mockImplementation(
      (type: string, action: string) => `saved_object:${type}/${action}`
    );
  });

  it('returns all types unfiltered when RBAC is not enforced for the request', async () => {
    authorization.mode.useRbacForRequest.mockReturnValue(false);

    const result = await getUpdatableSavedObjectTypes({
      request,
      types: ['dashboard', 'map'],
      authorization,
    });

    expect(result).toEqual(['dashboard', 'map']);
    expect(authorization.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
  });

  it('returns all types unfiltered when no authorization service is provided', async () => {
    const result = await getUpdatableSavedObjectTypes({
      request,
      types: ['dashboard', 'map'],
      authorization: undefined,
    });

    expect(result).toEqual(['dashboard', 'map']);
  });

  it('checks the `update` action by default', async () => {
    authorization.mode.useRbacForRequest.mockReturnValue(true);
    const checkPrivileges = jest.fn().mockResolvedValue({ privileges: { kibana: [] } });
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);

    await getUpdatableSavedObjectTypes({ request, types: ['dashboard'], authorization });

    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [authorization.actions.savedObject.get('dashboard', 'update')],
    });
  });

  it('checks a caller-supplied action instead, when provided', async () => {
    authorization.mode.useRbacForRequest.mockReturnValue(true);
    const checkPrivileges = jest.fn().mockResolvedValue({ privileges: { kibana: [] } });
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);

    await getUpdatableSavedObjectTypes({
      request,
      types: ['tag'],
      authorization,
      action: 'delete',
    });

    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [authorization.actions.savedObject.get('tag', 'delete')],
    });
  });

  it('filters out types the privilege check does not authorize', async () => {
    authorization.mode.useRbacForRequest.mockReturnValue(true);
    const updatePrivilege = authorization.actions.savedObject.get('dashboard', 'update');
    const checkPrivileges = jest.fn().mockResolvedValue({
      privileges: {
        kibana: [
          { privilege: updatePrivilege, authorized: true },
          {
            privilege: authorization.actions.savedObject.get('map', 'update'),
            authorized: false,
          },
        ],
      },
    });
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);

    const result = await getUpdatableSavedObjectTypes({
      request,
      types: ['dashboard', 'map'],
      authorization,
    });

    expect(result).toEqual(['dashboard']);
  });
});
