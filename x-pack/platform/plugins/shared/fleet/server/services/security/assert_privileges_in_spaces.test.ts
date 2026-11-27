/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { FleetUnauthorizedError } from '../../errors';
import { appContextService } from '..';

import { getAllSpaceIds } from '../spaces/helpers';

import {
  assertPrivilegesInSpaces,
  assertCanManageDefaultSettings,
  assertCanWriteSettingsObject,
} from './assert_privileges_in_spaces';

jest.mock('../spaces/helpers');
const mockGetAllSpaceIds = getAllSpaceIds as jest.Mock;

// Mutable stubs closed over by the mock factory so tests can override them per-test.
const mockFns = {
  useRbacForRequest: jest.fn().mockReturnValue(true),
  atSpaces: jest.fn().mockResolvedValue({ hasAllRequested: true }),
  globally: jest.fn().mockResolvedValue({ hasAllRequested: true }),
};

jest.mock('..', () => ({
  appContextService: {
    getSecurity: jest.fn(),
  },
}));

const mockGetSecurity = appContextService.getSecurity as jest.Mock;

function makeSecurityStub() {
  return {
    authz: {
      mode: {
        useRbacForRequest: (...args: unknown[]) => mockFns.useRbacForRequest(...args),
      },
      actions: {
        api: { get: (name: string) => `api:${name}` },
      },
      checkPrivilegesWithRequest: jest.fn().mockReturnValue({
        atSpaces: (...args: unknown[]) => mockFns.atSpaces(...args),
        globally: (...args: unknown[]) => mockFns.globally(...args),
      }),
    },
  };
}

const mockRequest = {} as KibanaRequest;

beforeEach(() => {
  jest.clearAllMocks();
  mockFns.useRbacForRequest.mockReturnValue(true);
  mockFns.atSpaces.mockResolvedValue({ hasAllRequested: true });
  mockFns.globally.mockResolvedValue({ hasAllRequested: true });
  mockGetSecurity.mockReturnValue(makeSecurityStub());
});

describe('assertPrivilegesInSpaces', () => {
  it('returns without error when the caller holds all required privileges', async () => {
    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['default', 'space-a'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'No access',
      })
    ).resolves.toBeUndefined();

    expect(mockFns.atSpaces).toHaveBeenCalledWith(['default', 'space-a'], expect.any(Object));
  });

  it('throws FleetUnauthorizedError with the given message when hasAllRequested is false', async () => {
    mockFns.atSpaces.mockResolvedValue({ hasAllRequested: false });

    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['default', 'restricted-space'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'Insufficient privileges to delete output xyz',
      })
    ).rejects.toThrow(FleetUnauthorizedError);

    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['default', 'restricted-space'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'Insufficient privileges to delete output xyz',
      })
    ).rejects.toThrow('Insufficient privileges to delete output xyz');
  });

  it('does not include space IDs in the error message', async () => {
    mockFns.atSpaces.mockResolvedValue({ hasAllRequested: false });

    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['hidden-space-1', 'hidden-space-2'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'Access denied to hidden spaces',
      })
    ).rejects.toThrow('Access denied to hidden spaces');

    // The actual space IDs must not appear in the message
    try {
      await assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['hidden-space-1', 'hidden-space-2'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'Access denied to hidden spaces',
      });
    } catch (e) {
      expect(e.message).not.toContain('hidden-space-1');
      expect(e.message).not.toContain('hidden-space-2');
    }
  });

  it('is a no-op when security is not available', async () => {
    mockGetSecurity.mockReturnValue(undefined);

    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['default', 'space-a'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'No access',
      })
    ).resolves.toBeUndefined();

    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });

  it('is a no-op when RBAC is not active for the request', async () => {
    mockFns.useRbacForRequest.mockReturnValue(false);

    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['default', 'space-a'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'No access',
      })
    ).resolves.toBeUndefined();

    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });

  it('is a no-op when spaceIds is empty', async () => {
    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: [],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'No access',
      })
    ).resolves.toBeUndefined();

    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });

  it('uses globally() check when spaceIds contains ALL_SPACES_ID (*)', async () => {
    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['*'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'No access',
      })
    ).resolves.toBeUndefined();

    expect(mockFns.globally).toHaveBeenCalled();
    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });

  it('throws when globally() check fails for ALL_SPACES_ID', async () => {
    mockFns.globally.mockResolvedValue({ hasAllRequested: false });

    await expect(
      assertPrivilegesInSpaces({
        request: mockRequest,
        spaceIds: ['*'],
        apiPrivileges: ['fleet-agent-policies-all'],
        errorMessage: 'No global access',
      })
    ).rejects.toThrow('No global access');

    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });

  it('checks globally() for * and atSpaces() for concrete spaces when both are present', async () => {
    await assertPrivilegesInSpaces({
      request: mockRequest,
      spaceIds: ['*', 'space-a'],
      apiPrivileges: ['fleet-agent-policies-all'],
      errorMessage: 'No access',
    });

    expect(mockFns.globally).toHaveBeenCalled();
    expect(mockFns.atSpaces).toHaveBeenCalledWith(['space-a'], expect.any(Object));
  });

  it('maps each apiPrivilege through authz.actions.api.get before passing to atSpaces', async () => {
    const security = makeSecurityStub();
    const apiGetSpy = jest.spyOn(security.authz.actions.api, 'get');
    mockGetSecurity.mockReturnValue(security);

    await assertPrivilegesInSpaces({
      request: mockRequest,
      spaceIds: ['default'],
      apiPrivileges: ['integrations-all', 'fleet-agent-policies-all'],
      errorMessage: 'No access',
    });

    expect(apiGetSpy).toHaveBeenCalledWith('integrations-all');
    expect(apiGetSpy).toHaveBeenCalledWith('fleet-agent-policies-all');
    expect(mockFns.atSpaces).toHaveBeenCalledWith(['default'], {
      kibana: ['api:integrations-all', 'api:fleet-agent-policies-all'],
    });
  });
});

describe('assertCanManageDefaultSettings', () => {
  beforeEach(() => {
    mockGetAllSpaceIds.mockResolvedValue({
      spaceIds: new Set(['space1', 'space2']),
      truncated: false,
    });
  });

  it('requires fleet-agent-policies-all in every existing space', async () => {
    await expect(assertCanManageDefaultSettings(mockRequest, 'output')).resolves.toBeUndefined();

    expect(mockFns.atSpaces).toHaveBeenCalledWith(['space1', 'space2'], {
      kibana: ['api:fleet-agent-policies-all'],
    });
    expect(mockFns.globally).not.toHaveBeenCalled();
  });

  it('throws when the caller lacks the privilege in an existing space', async () => {
    mockFns.atSpaces.mockResolvedValue({ hasAllRequested: false });

    await expect(assertCanManageDefaultSettings(mockRequest, 'Fleet Server host')).rejects.toThrow(
      FleetUnauthorizedError
    );
  });

  it('fails closed when the space listing is truncated', async () => {
    mockGetAllSpaceIds.mockResolvedValue({ spaceIds: new Set(['default']), truncated: true });

    await expect(assertCanManageDefaultSettings(mockRequest, 'output')).rejects.toThrow(
      FleetUnauthorizedError
    );
    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });

  it('is a no-op when RBAC is not active for the request', async () => {
    mockFns.useRbacForRequest.mockReturnValue(false);

    await expect(
      assertCanManageDefaultSettings(mockRequest, 'download source')
    ).resolves.toBeUndefined();
    expect(mockGetAllSpaceIds).not.toHaveBeenCalled();
  });
});

describe('assertCanWriteSettingsObject', () => {
  const getSpaces = jest.fn();
  const params = (isDefault: boolean) => ({
    request: mockRequest,
    objectType: 'download source',
    id: 'ds-1',
    action: 'update' as const,
    isDefault,
    references: [{ getSpaces, apiPrivileges: ['fleet-agent-policies-all'] }],
  });

  beforeEach(() => {
    getSpaces.mockReset();
    getSpaces.mockResolvedValue({ spaceIds: new Set(['space-a']), truncated: false });
    mockGetAllSpaceIds.mockResolvedValue({ spaceIds: new Set(['default']), truncated: false });
  });

  it('checks the spaces of referencing policies for a non-default object', async () => {
    await assertCanWriteSettingsObject(params(false));

    expect(mockFns.atSpaces).toHaveBeenCalledWith(['space-a'], expect.any(Object));
    expect(mockGetAllSpaceIds).not.toHaveBeenCalled();
  });

  it('checks all spaces, and only all spaces, for a default object', async () => {
    await assertCanWriteSettingsObject(params(true));

    expect(mockFns.atSpaces).toHaveBeenCalledWith(['default'], expect.any(Object));
    expect(getSpaces).not.toHaveBeenCalled();
  });

  it('fails closed when a reference lookup is truncated', async () => {
    getSpaces.mockResolvedValue({ spaceIds: new Set(['space-a']), truncated: true });

    await expect(assertCanWriteSettingsObject(params(false))).rejects.toThrow(
      /too many agent policies/
    );
    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });

  it('skips lookups when RBAC is not active for the request', async () => {
    mockFns.useRbacForRequest.mockReturnValue(false);

    await assertCanWriteSettingsObject(params(false));

    expect(getSpaces).not.toHaveBeenCalled();
  });
});
