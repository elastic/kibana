/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { FleetUnauthorizedError } from '../../errors';
import { appContextService } from '..';

import {
  assertPrivilegesInSpaces,
  assertCanManageDefaultSettings,
} from './assert_privileges_in_spaces';

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
  it('requires fleet-agent-policies-all in exactly the spaces that hold policies', async () => {
    await expect(
      assertCanManageDefaultSettings(mockRequest, 'output', ['space1', 'space2'])
    ).resolves.toBeUndefined();

    // A per-space check over the affected spaces, not a blanket global grant.
    expect(mockFns.atSpaces).toHaveBeenCalledWith(['space1', 'space2'], {
      kibana: ['api:fleet-agent-policies-all'],
    });
    expect(mockFns.globally).not.toHaveBeenCalled();
  });

  it('allows a caller scoped to only the default space when that is the only policy space', async () => {
    await expect(
      assertCanManageDefaultSettings(mockRequest, 'output', ['default'])
    ).resolves.toBeUndefined();
    expect(mockFns.atSpaces).toHaveBeenCalledWith(['default'], expect.any(Object));
  });

  it('throws when the caller lacks the privilege in an affected space', async () => {
    mockFns.atSpaces.mockResolvedValue({ hasAllRequested: false });

    await expect(
      assertCanManageDefaultSettings(mockRequest, 'fleet server host', ['default', 'space-a'])
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('is a no-op when no policies exist (empty affected spaces)', async () => {
    await expect(
      assertCanManageDefaultSettings(mockRequest, 'download source', [])
    ).resolves.toBeUndefined();
    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });

  it('is a no-op when RBAC is not active for the request', async () => {
    mockFns.useRbacForRequest.mockReturnValue(false);

    await expect(
      assertCanManageDefaultSettings(mockRequest, 'download source', ['default'])
    ).resolves.toBeUndefined();
    expect(mockFns.atSpaces).not.toHaveBeenCalled();
  });
});
