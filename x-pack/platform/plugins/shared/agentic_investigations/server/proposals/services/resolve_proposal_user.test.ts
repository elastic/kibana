/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createProposalUserResolver } from './resolve_proposal_user';

const request = httpServerMock.createKibanaRequest();

const createDeps = () => {
  const userProfile = { getCurrent: jest.fn() };
  const security = { authc: { getCurrentUser: jest.fn() } };
  return {
    userProfile,
    security,
    resolve: createProposalUserResolver({
      userProfile: userProfile as never,
      security: security as never,
      logger: loggerMock.create(),
    }),
  };
};

describe('createProposalUserResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prefer the profile, since its uid is what a UI resolves an avatar from', async () => {
    const { userProfile, security, resolve } = createDeps();
    userProfile.getCurrent.mockResolvedValue({
      uid: 'profile-uid',
      user: { username: 'analyst', full_name: 'An Analyst', email: 'analyst@example.com' },
    });

    await expect(resolve(request)).resolves.toEqual({
      username: 'analyst',
      fullName: 'An Analyst',
      email: 'analyst@example.com',
      profileUid: 'profile-uid',
    });
    expect(security.authc.getCurrentUser).not.toHaveBeenCalled();
  });

  it('should still attribute the action when there is no profile', async () => {
    const { userProfile, security, resolve } = createDeps();
    // Null is the documented answer for an anonymous user, a `run-as` proxy, a
    // session without a profile, or an API key with no activated profile.
    userProfile.getCurrent.mockResolvedValue(null);
    security.authc.getCurrentUser.mockReturnValue({
      username: 'analyst',
      full_name: undefined,
      email: undefined,
    });

    await expect(resolve(request)).resolves.toEqual({
      username: 'analyst',
      fullName: null,
      email: null,
    });
  });

  it('should fall back rather than propagate a profile lookup failure', async () => {
    const { userProfile, security, resolve } = createDeps();
    userProfile.getCurrent.mockRejectedValue(new Error('profiles unavailable'));
    security.authc.getCurrentUser.mockReturnValue({ username: 'analyst' });

    await expect(resolve(request)).resolves.toEqual({
      username: 'analyst',
      fullName: null,
      email: null,
    });
  });

  it('should keep a uid the authenticating layer already bound', async () => {
    const { userProfile, security, resolve } = createDeps();
    userProfile.getCurrent.mockResolvedValue(null);
    security.authc.getCurrentUser.mockReturnValue({
      username: 'analyst',
      profile_uid: 'bound-uid',
    });

    await expect(resolve(request)).resolves.toEqual(
      expect.objectContaining({ profileUid: 'bound-uid' })
    );
  });

  it('should return undefined when there is no identity at all', async () => {
    const { userProfile, security, resolve } = createDeps();
    userProfile.getCurrent.mockResolvedValue(null);
    security.authc.getCurrentUser.mockReturnValue(null);

    await expect(resolve(request)).resolves.toBeUndefined();
  });
});
