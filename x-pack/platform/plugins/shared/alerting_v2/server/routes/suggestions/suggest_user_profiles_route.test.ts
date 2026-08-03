/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { createRouteDependencies } from '../test_utils';
import { SuggestUserProfilesRoute } from './suggest_user_profiles_route';

const request = httpServerMock.createKibanaRequest({ body: { name: 'john', size: 10 } });
const securityStart = securityMock.createStart();

describe('SuggestUserProfilesRoute', () => {
  it('returns suggested profiles for current space', async () => {
    const { ctx } = createRouteDependencies();

    securityStart.userProfiles.suggest.mockResolvedValue([{ uid: 'u-1' } as any]);

    const route = new SuggestUserProfilesRoute(ctx, request, securityStart);

    await route.handle();

    expect(securityStart.userProfiles.suggest).toHaveBeenCalledWith({
      name: 'john',
      size: 10,
      dataPath: 'avatar',
    });
    expect(ctx.response.ok).toHaveBeenCalledWith({ body: [{ uid: 'u-1' }] });
  });

  it('accepts dataPath in body', async () => {
    const { ctx } = createRouteDependencies();
    const requestWithDataPath = httpServerMock.createKibanaRequest({
      body: { name: 'john', size: 10, dataPath: 'avatar' },
    });

    securityStart.userProfiles.suggest.mockResolvedValue([]);

    const route = new SuggestUserProfilesRoute(ctx, requestWithDataPath, securityStart);

    await route.handle();

    expect(securityStart.userProfiles.suggest).toHaveBeenCalledWith(
      expect.objectContaining({ dataPath: 'avatar' })
    );
  });

  it('returns customError on suggest failure', async () => {
    const { ctx } = createRouteDependencies();

    securityStart.userProfiles.suggest.mockRejectedValue(new Error('boom'));

    const route = new SuggestUserProfilesRoute(ctx, request, securityStart);

    await route.handle();

    expect(ctx.response.customError).toHaveBeenCalledTimes(1);
  });
});
