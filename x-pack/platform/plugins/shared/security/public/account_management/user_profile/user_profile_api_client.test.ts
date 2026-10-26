/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import { kibanaResponseFactory } from '@kbn/core-http-router-server-internal';

import { UserProfileAPIClient } from './user_profile_api_client';

describe('UserProfileAPIClient', () => {
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let apiClient: UserProfileAPIClient;
  beforeEach(() => {
    coreStart = coreMock.createStart();
    coreStart.http.get.mockResolvedValue(undefined);
    coreStart.http.post.mockResolvedValue(undefined);

    apiClient = new UserProfileAPIClient(coreStart.http);
  });

  it('should enable the user profile after fetching the data', async () => {
    const promiseEnabled = firstValueFrom(apiClient.enabled$);
    apiClient.start(); // Start will fetch the user profile data
    const enabled = await promiseEnabled;
    expect(enabled).toBe(true);
  });

  it('should not enable the user profile for anonymous paths', async () => {
    coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
    const promiseEnabled = firstValueFrom(apiClient.enabled$);
    apiClient.start();

    const enabled = await promiseEnabled;
    expect(enabled).toBe(false);
    // Ensure that the user profile was not fetched
    expect(coreStart.http.get).not.toHaveBeenCalled();
  });

  it('should not enable the user profile if we get a 404 from fetching the profile', async () => {
    const err = new Error('Awwww');
    (err as any).response = kibanaResponseFactory.notFound();
    coreStart.http.get.mockRejectedValue(err);

    const promiseEnabled = firstValueFrom(apiClient.enabled$);
    apiClient.start(); // Start will fetch the user profile data

    const enabled = await promiseEnabled;
    expect(enabled).toBe(false);
  });

  it('should enable the user profile for any other error than a 404', async () => {
    coreStart.http.get.mockRejectedValue(new Error('Awwww'));

    const promiseEnabled = firstValueFrom(apiClient.enabled$);
    apiClient.start();

    const enabled = await promiseEnabled;
    expect(enabled).toBe(true);
  });

  it('should get user profile without retrieving any user data', async () => {
    await apiClient.getCurrent();
    expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security/user_profile', {
      query: { dataPath: undefined },
    });
  });

  it('should get user profile and user data', async () => {
    await apiClient.getCurrent({ dataPath: '*' });
    expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security/user_profile', {
      query: { dataPath: '*' },
    });
  });

  it('should update user data', async () => {
    await apiClient.update({ avatar: { imageUrl: 'avatar.png' } });
    expect(coreStart.http.post).toHaveBeenCalledWith('/internal/security/user_profile/_data', {
      body: '{"avatar":{"imageUrl":"avatar.png"}}',
    });
  });

  it('should get user profiles in bulk', async () => {
    await apiClient.bulkGet({ uids: new Set(['UID-1', 'UID-2']), dataPath: '*' });
    expect(coreStart.http.post).toHaveBeenCalledWith('/internal/security/user_profile/_bulk_get', {
      body: '{"uids":["UID-1","UID-2"],"dataPath":"*"}',
    });
  });

  describe('getCurrent caching', () => {
    it('dedupes concurrent calls for the same dataPath into a single request', async () => {
      const [first, second] = await Promise.all([
        apiClient.getCurrent({ dataPath: 'avatar,userSettings' }),
        apiClient.getCurrent({ dataPath: 'avatar,userSettings' }),
      ]);

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(first).toBe(second);
    });

    it('treats dataPath namespace order as equivalent for caching purposes', async () => {
      await apiClient.getCurrent({ dataPath: 'avatar,userSettings' });
      await apiClient.getCurrent({ dataPath: 'userSettings,avatar' });

      expect(coreStart.http.get).toHaveBeenCalledTimes(1);
      expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security/user_profile', {
        query: { dataPath: 'avatar,userSettings' },
      });
    });

    it('does not cache a failed request, so a retry issues a new one', async () => {
      coreStart.http.get.mockRejectedValueOnce(new Error('boom'));

      await expect(apiClient.getCurrent({ dataPath: 'avatar' })).rejects.toThrow('boom');
      await apiClient.getCurrent({ dataPath: 'avatar' });

      expect(coreStart.http.get).toHaveBeenCalledTimes(2);
    });

    it('clears the cache on update, so a subsequent getCurrent re-fetches', async () => {
      await apiClient.getCurrent({ dataPath: 'avatar' });
      await apiClient.update({ avatar: { imageUrl: 'avatar.png' } });
      await apiClient.getCurrent({ dataPath: 'avatar' });

      expect(coreStart.http.get).toHaveBeenCalledTimes(2);
    });
  });
});
