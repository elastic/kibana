/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { apiPrivileges } from '../../common/features';
import {
  MANAGE_MEMORY_REQUIRED_MESSAGE,
  NO_PROFILE_MESSAGE,
  canActOnUserMemory,
  resolveMemoryUser,
  toError,
} from './memory_user';

const requestWith = (authzResult?: Record<string, boolean>) =>
  Object.assign(httpServerMock.createKibanaRequest(), { authzResult });

describe('canActOnUserMemory', () => {
  it('allows the memory of the caller without manage memory', () => {
    expect(canActOnUserMemory(requestWith({}), 'jdoe', 'jdoe')).toBe(true);
  });

  it('rejects the memory of another user without manage memory', () => {
    expect(
      canActOnUserMemory(requestWith({ [apiPrivileges.manageMemory]: false }), 'other', 'jdoe')
    ).toBe(false);
  });

  it('allows the memory of another user with manage memory', () => {
    expect(
      canActOnUserMemory(requestWith({ [apiPrivileges.manageMemory]: true }), 'other', 'jdoe')
    ).toBe(true);
  });

  it('treats any user as another user when the caller has no profile', () => {
    expect(canActOnUserMemory(requestWith({}), 'jdoe', undefined)).toBe(false);
    expect(
      canActOnUserMemory(requestWith({ [apiPrivileges.manageMemory]: true }), 'jdoe', undefined)
    ).toBe(true);
  });

  it('rejects the memory of another user when no privileges were checked', () => {
    expect(canActOnUserMemory(requestWith(undefined), 'other', 'jdoe')).toBe(false);
  });
});

describe('resolveMemoryUser', () => {
  const userProfileWith = (profileId: string | null) => ({
    getCurrentProfileId: async () => profileId,
  });

  it('defaults to the caller profile without manage_memory', async () => {
    await expect(
      resolveMemoryUser({
        request: requestWith({ [apiPrivileges.manageMemory]: false }),
        userProfile: userProfileWith('u_jdoe'),
      })
    ).resolves.toEqual({ ok: true, userId: 'u_jdoe' });
  });

  it('returns Forbidden when caller has no profile and user_id is omitted', async () => {
    const result = await resolveMemoryUser({
      request: requestWith({ [apiPrivileges.manageMemory]: true }),
      userProfile: userProfileWith(null),
    });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ name: 'Forbidden', message: NO_PROFILE_MESSAGE }),
    });
  });

  it('returns Forbidden with target userId when targeting another user without manage_memory', async () => {
    const result = await resolveMemoryUser({
      request: requestWith({ [apiPrivileges.manageMemory]: false }),
      userProfile: userProfileWith('u_jdoe'),
      requestedUserId: 'u_other',
    });

    expect(result).toEqual({
      ok: false,
      userId: 'u_other',
      error: expect.objectContaining({
        name: 'Forbidden',
        message: MANAGE_MEMORY_REQUIRED_MESSAGE,
      }),
    });
  });

  it('allows targeting another user with manage_memory even without a caller profile', async () => {
    await expect(
      resolveMemoryUser({
        request: requestWith({ [apiPrivileges.manageMemory]: true }),
        userProfile: userProfileWith(null),
        requestedUserId: 'u_other',
      })
    ).resolves.toEqual({ ok: true, userId: 'u_other' });
  });
});

describe('toError', () => {
  it('returns Error instances unchanged and wraps non-Error values', () => {
    const original = new TypeError('boom');
    expect(toError(original)).toBe(original);
    expect(toError('string failure')).toEqual(new Error('string failure'));
  });
});
