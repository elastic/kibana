/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { findUnauthorizedTargetSpaces } from './authorize_target_spaces';

const request = {} as KibanaRequest;

describe('findUnauthorizedTargetSpaces', () => {
  it('returns nothing when no spaces are requested', async () => {
    const checkManageEvalsPrivileges = jest.fn();

    const result = await findUnauthorizedTargetSpaces({
      request,
      requestedSpaceIds: undefined,
      activeSpaceId: 'default',
      checkManageEvalsPrivileges,
    });

    expect(result).toEqual([]);
    expect(checkManageEvalsPrivileges).not.toHaveBeenCalled();
  });

  it('does not check when the only requested space is the active space', async () => {
    const checkManageEvalsPrivileges = jest.fn();

    const result = await findUnauthorizedTargetSpaces({
      request,
      requestedSpaceIds: ['marketing', 'marketing'],
      activeSpaceId: 'marketing',
      checkManageEvalsPrivileges,
    });

    expect(result).toEqual([]);
    expect(checkManageEvalsPrivileges).not.toHaveBeenCalled();
  });

  it('authorizes foreign spaces against the privilege checker (deduplicated)', async () => {
    const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(true);

    const result = await findUnauthorizedTargetSpaces({
      request,
      requestedSpaceIds: ['marketing', 'sales', 'sales', 'ops'],
      activeSpaceId: 'marketing',
      checkManageEvalsPrivileges,
    });

    expect(result).toEqual([]);
    expect(checkManageEvalsPrivileges).toHaveBeenCalledWith(request, ['sales', 'ops']);
  });

  it('returns the foreign spaces when the caller is not authorized', async () => {
    const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(false);

    const result = await findUnauthorizedTargetSpaces({
      request,
      requestedSpaceIds: ['sales', 'ops'],
      activeSpaceId: 'marketing',
      checkManageEvalsPrivileges,
    });

    expect(result).toEqual(['sales', 'ops']);
  });

  it('fails closed when no privilege checker is wired', async () => {
    const result = await findUnauthorizedTargetSpaces({
      request,
      requestedSpaceIds: ['sales'],
      activeSpaceId: 'marketing',
      checkManageEvalsPrivileges: undefined,
    });

    expect(result).toEqual(['sales']);
  });
});
