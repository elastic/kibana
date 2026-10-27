/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { toStableUserId } from './stable_user_id';

describe('toStableUserId', () => {
  it('prefers profile uid when present', async () => {
    await expect(
      toStableUserId({
        request: httpServerMock.createKibanaRequest(),
        resolveApiKeyProfileUid: jest.fn(),
        authUser: {
          username: 'shareduser',
          profile_uid: 'profile-123',
          authentication_type: 'realm',
          authentication_realm: { type: 'file', name: 'file1' },
        },
      })
    ).resolves.toBe('profile-123');
  });

  it('falls back to a realm-qualified id when profile uid is missing', async () => {
    await expect(
      toStableUserId({
        request: httpServerMock.createKibanaRequest(),
        resolveApiKeyProfileUid: jest.fn(),
        authUser: {
          username: 'shareduser',
          authentication_type: 'realm',
          authentication_realm: { type: 'file', name: 'file1' },
        },
      })
    ).resolves.toBe('realm:["file","file1","shareduser"]');
    await expect(
      toStableUserId({
        request: httpServerMock.createKibanaRequest(),
        resolveApiKeyProfileUid: jest.fn(),
        authUser: {
          username: 'shareduser',
          authentication_type: 'realm',
          authentication_realm: { type: 'native', name: 'native1' },
        },
      })
    ).resolves.toBe('realm:["native","native1","shareduser"]');
  });

  it('returns undefined when neither profile uid nor realm identity is available', async () => {
    await expect(
      toStableUserId({
        request: httpServerMock.createKibanaRequest(),
        resolveApiKeyProfileUid: jest.fn(),
        authUser: { username: 'shareduser', authentication_type: 'realm' },
      })
    ).resolves.toBeUndefined();
  });

  it('resolves API key creator profile uid via the injected callback', async () => {
    const resolveApiKeyProfileUid = jest.fn().mockResolvedValue('profile-from-api-key');

    await expect(
      toStableUserId({
        request: httpServerMock.createKibanaRequest(),
        authUser: {
          username: 'shareduser',
          authentication_type: 'api_key',
          authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
        },
        resolveApiKeyProfileUid,
      })
    ).resolves.toBe('profile-from-api-key');
    expect(resolveApiKeyProfileUid).toHaveBeenCalledTimes(1);
  });

  it('treats a fake request as API key auth even when its identity hides the type', async () => {
    const resolveApiKeyProfileUid = jest.fn().mockResolvedValue('profile-from-api-key');

    await expect(
      toStableUserId({
        authUser: { username: 'scheduling-user' },
        request: httpServerMock.createFakeKibanaRequest({}),
        resolveApiKeyProfileUid,
      })
    ).resolves.toBe('profile-from-api-key');
    expect(resolveApiKeyProfileUid).toHaveBeenCalledTimes(1);
  });

  it('does not use the _es_api_key realm when no profile uid is available', async () => {
    const resolveApiKeyProfileUid = jest.fn().mockResolvedValue(undefined);

    await expect(
      toStableUserId({
        request: httpServerMock.createKibanaRequest(),
        authUser: {
          username: 'shareduser',
          authentication_type: 'api_key',
          authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
        },
        resolveApiKeyProfileUid,
      })
    ).resolves.toBeUndefined();
    expect(resolveApiKeyProfileUid).toHaveBeenCalledTimes(1);
  });

  it('does not call resolveApiKeyProfileUid when profile uid is already present', async () => {
    const resolveApiKeyProfileUid = jest.fn();

    await expect(
      toStableUserId({
        request: httpServerMock.createKibanaRequest(),
        authUser: {
          username: 'shareduser',
          profile_uid: 'profile-123',
          authentication_type: 'api_key',
          authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
        },
        resolveApiKeyProfileUid,
      })
    ).resolves.toBe('profile-123');
    expect(resolveApiKeyProfileUid).not.toHaveBeenCalled();
  });
});
