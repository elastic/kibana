/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { authorizeMemoryRequest } from './authorize_request';

const request = {} as never;

describe('authorizeMemoryRequest', () => {
  it('returns the resolved identity after checking the requested space privilege', async () => {
    const atSpace = jest.fn().mockResolvedValue({ hasAllRequested: true });
    const getCurrentUser = jest
      .fn()
      .mockReturnValue({ username: 'user-1', profile_uid: 'profile-user-1' });

    const result = await authorizeMemoryRequest({
      request,
      spaceId: 'space-1',
      privilege: 'read_agent_memory',
      security: {
        authz: {
          checkPrivilegesWithRequest: jest.fn().mockReturnValue({ atSpace }),
          actions: { api: { get: (privilege: string) => privilege } },
        },
      } as never,
      coreSecurity: {
        authc: { getCurrentUser },
      } as never,
    });

    expect(atSpace).toHaveBeenCalledWith('space-1', {
      kibana: ['read_agent_memory'],
    });
    expect(result).toEqual({
      status: 'authorized',
      identity: { author: 'profile-user-1', author_kind: 'profile_uid' },
    });
  });

  it('returns forbidden when the requested privilege is denied', async () => {
    const getCurrentUser = jest.fn();

    const result = await authorizeMemoryRequest({
      request,
      spaceId: 'space-1',
      privilege: 'write_agent_memory',
      security: {
        authz: {
          checkPrivilegesWithRequest: jest.fn().mockReturnValue({
            atSpace: jest.fn().mockResolvedValue({ hasAllRequested: false }),
          }),
          actions: { api: { get: (privilege: string) => privilege } },
        },
      } as never,
      coreSecurity: {
        authc: { getCurrentUser },
      } as never,
    });

    expect(result).toEqual({ status: 'forbidden' });
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('returns missing_identity when privilege is granted without an authenticated identity', async () => {
    const result = await authorizeMemoryRequest({
      request,
      spaceId: 'space-1',
      privilege: 'read_agent_memory',
      security: {
        authz: {
          checkPrivilegesWithRequest: jest.fn().mockReturnValue({
            atSpace: jest.fn().mockResolvedValue({ hasAllRequested: true }),
          }),
          actions: { api: { get: (privilege: string) => privilege } },
        },
      } as never,
      coreSecurity: {
        authc: { getCurrentUser: jest.fn().mockReturnValue(null) },
      } as never,
    });

    expect(result).toEqual({ status: 'missing_identity' });
  });
});
