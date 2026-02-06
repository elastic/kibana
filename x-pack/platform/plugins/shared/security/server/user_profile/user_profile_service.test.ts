/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  SecurityActivateUserProfileResponse,
  SecurityGetUserProfileResponse,
  SecuritySuggestUserProfilesResponse,
} from '@elastic/elasticsearch/lib/api/types';

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { prefixCommaSeparatedValues, UserProfileService } from './user_profile_service';
import type { UserProfileWithSecurity } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import { userProfileMock } from '../../common/model/user_profile.mock';
import { authorizationMock } from '../authorization/index.mock';
import { securityMock } from '../mocks';
import { sessionMock } from '../session_management/session.mock';

const logger = loggingSystemMock.createLogger();
describe('UserProfileService', () => {
  let mockStartParams: {
    clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
    session: ReturnType<typeof sessionMock.create>;
  };
  let mockAuthz: ReturnType<typeof authorizationMock.create>;
  let userProfileService: UserProfileService;
  beforeEach(() => {
    mockStartParams = {
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      session: sessionMock.create(),
    };
    mockAuthz = authorizationMock.create();

    userProfileService = new UserProfileService(logger);

    userProfileService.setup({
      authz: mockAuthz,
      license: licenseMock.create({ allowUserProfileCollaboration: true }),
    });
  });

  afterEach(() => {
    logger.error.mockClear();
  });

  it('should expose correct start contract', () => {
    const startContract = userProfileService.start(mockStartParams);
    expect(startContract).toMatchInlineSnapshot(`
      Object {
        "activate": [Function],
        "bulkGet": [Function],
        "getCurrent": [Function],
        "suggest": [Function],
        "update": [Function],
      }
    `);
  });

  describe('#getCurrent', () => {
    let mockUserProfile: UserProfileWithSecurity;
    let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
    beforeEach(() => {
      mockRequest = httpServerMock.createKibanaRequest();

      mockUserProfile = userProfileMock.createWithSecurity({
        uid: 'UID',
        user: {
          username: 'user-1',
          full_name: 'full-name-1',
          realm_name: 'some-realm',
          realm_domain: 'some-domain',
          roles: ['role-1'],
        },
      });

      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        profiles: [mockUserProfile],
      } as unknown as SecurityGetUserProfileResponse);
    });

    it('returns `null` if session is not available', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.getCurrent({ request: mockRequest })).resolves.toBeNull();

      expect(mockStartParams.session.get).toHaveBeenCalledTimes(1);
      expect(mockStartParams.session.get).toHaveBeenCalledWith(mockRequest);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).not.toHaveBeenCalled();
    });

    it('returns `null` if session available, but not user profile id', async () => {
      mockStartParams.session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: undefined }),
      });

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.getCurrent({ request: mockRequest })).resolves.toBeNull();

      expect(mockStartParams.session.get).toHaveBeenCalledTimes(1);
      expect(mockStartParams.session.get).toHaveBeenCalledWith(mockRequest);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).not.toHaveBeenCalled();
    });

    it('fails if session retrieval fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'some message' })
      );
      mockStartParams.session.get.mockRejectedValue(failureReason);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.getCurrent({ request: mockRequest })).rejects.toBe(failureReason);

      expect(mockStartParams.session.get).toHaveBeenCalledTimes(1);
      expect(mockStartParams.session.get).toHaveBeenCalledWith(mockRequest);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).not.toHaveBeenCalled();
    });

    it('fails if profile retrieval fails', async () => {
      mockStartParams.session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: mockUserProfile.uid }),
      });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.getCurrent({ request: mockRequest })).rejects.toBe(failureReason);

      expect(mockStartParams.session.get).toHaveBeenCalledTimes(1);
      expect(mockStartParams.session.get).toHaveBeenCalledWith(mockRequest);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID',
      });
    });

    it('fails if cannot find user profile', async () => {
      mockStartParams.session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: mockUserProfile.uid }),
      });

      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        profiles: [],
      } as unknown as SecurityGetUserProfileResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.getCurrent({ request: mockRequest })
      ).rejects.toMatchInlineSnapshot(`[Error: User profile is not found.]`);

      expect(mockStartParams.session.get).toHaveBeenCalledTimes(1);
      expect(mockStartParams.session.get).toHaveBeenCalledWith(mockRequest);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID',
      });
    });

    it('properly parses returned profile', async () => {
      mockStartParams.session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: mockUserProfile.uid }),
      });

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.getCurrent({ request: mockRequest })).resolves
        .toMatchInlineSnapshot(`
              Object {
                "data": Object {},
                "enabled": true,
                "labels": Object {},
                "uid": "UID",
                "user": Object {
                  "email": undefined,
                  "full_name": "full-name-1",
                  "realm_domain": "some-domain",
                  "realm_name": "some-realm",
                  "roles": Array [
                    "role-1",
                  ],
                  "username": "user-1",
                },
              }
            `);

      expect(mockStartParams.session.get).toHaveBeenCalledTimes(1);
      expect(mockStartParams.session.get).toHaveBeenCalledWith(mockRequest);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID',
      });
    });

    it('should get user profile and application data scoped to Kibana', async () => {
      mockStartParams.session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: mockUserProfile.uid }),
      });

      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        profiles: [
          userProfileMock.createWithSecurity({
            ...mockUserProfile,
            data: { kibana: { avatar: 'fun.gif' }, other_app: { secret: 'data' } },
          }),
        ],
      } as unknown as SecurityGetUserProfileResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.getCurrent({ request: mockRequest, dataPath: 'one,two' })).resolves
        .toMatchInlineSnapshot(`
              Object {
                "data": Object {
                  "avatar": "fun.gif",
                },
                "enabled": true,
                "labels": Object {},
                "uid": "UID",
                "user": Object {
                  "email": undefined,
                  "full_name": "full-name-1",
                  "realm_domain": "some-domain",
                  "realm_name": "some-realm",
                  "roles": Array [
                    "role-1",
                  ],
                  "username": "user-1",
                },
              }
            `);

      expect(mockStartParams.session.get).toHaveBeenCalledTimes(1);
      expect(mockStartParams.session.get).toHaveBeenCalledWith(mockRequest);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID',
        data: 'kibana.one,kibana.two',
      });
    });
  });

  describe('#update', () => {
    it('should update application data scoped to Kibana', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await startContract.update('UID', {
        avatar: 'boring.png',
      });
      expect(
        mockStartParams.clusterClient.asInternalUser.security.updateUserProfileData
      ).toHaveBeenCalledWith({
        uid: 'UID',
        data: {
          kibana: {
            avatar: 'boring.png',
          },
        },
      });
    });

    it('should handle errors when update user profile fails', async () => {
      mockStartParams.clusterClient.asInternalUser.security.updateUserProfileData.mockRejectedValue(
        new Error('Fail')
      );
      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.update('UID', {
          avatar: 'boring.png',
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Fail]`);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('#activate', () => {
    beforeEach(() => {
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile.mockResolvedValue(
        userProfileMock.createWithSecurity() as unknown as SecurityActivateUserProfileResponse
      );
    });

    it('should activate user profile with password grant', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.activate({
          type: 'password',
          username: 'some-username',
          password: 'password',
        })
      ).resolves.toMatchInlineSnapshot(`
              Object {
                "data": Object {},
                "enabled": true,
                "labels": Object {},
                "uid": "some-profile-uid",
                "user": Object {
                  "email": "some@email",
                  "full_name": undefined,
                  "realm_domain": "some-realm-domain",
                  "realm_name": "some-realm",
                  "roles": Array [],
                  "username": "some-username",
                },
              }
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({
        grant_type: 'password',
        password: 'password',
        username: 'some-username',
      });
    });

    it('should activate user profile with access token grant', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.activate({ type: 'accessToken', accessToken: 'some-token' }))
        .resolves.toMatchInlineSnapshot(`
              Object {
                "data": Object {},
                "enabled": true,
                "labels": Object {},
                "uid": "some-profile-uid",
                "user": Object {
                  "email": "some@email",
                  "full_name": undefined,
                  "realm_domain": "some-realm-domain",
                  "realm_name": "some-realm",
                  "roles": Array [],
                  "username": "some-username",
                },
              }
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('should activate user profile with UIAM access token grant', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.activate({
          type: 'uiamAccessToken',
          accessToken: 'some-token',
          sharedSecret: 'some-shared-secret',
        })
      ).resolves.toMatchInlineSnapshot(`
        Object {
          "data": Object {},
          "enabled": true,
          "labels": Object {},
          "uid": "some-profile-uid",
          "user": Object {
            "email": "some@email",
            "full_name": undefined,
            "realm_domain": "some-realm-domain",
            "realm_name": "some-realm",
            "roles": Array [],
            "username": "some-username",
          },
        }
      `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({
        grant_type: 'access_token',
        access_token: 'some-token',
        client_authentication: { scheme: 'SharedSecret', value: 'some-shared-secret' },
      });
    });

    it('fails if activation fails with non-409 error', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.activate({ type: 'accessToken', accessToken: 'some-token' })
      ).rejects.toBe(failureReason);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('retries activation if initially fails with 409 error', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 409, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
        .mockRejectedValueOnce(failureReason)
        .mockResolvedValueOnce(
          userProfileMock.createWithSecurity() as unknown as SecurityActivateUserProfileResponse
        );

      const startContract = userProfileService.start(mockStartParams);
      const activatePromise = startContract.activate({
        type: 'accessToken',
        accessToken: 'some-token',
      });
      await nextTick();
      jest.runAllTimers();

      await expect(activatePromise).resolves.toMatchInlineSnapshot(`
              Object {
                "data": Object {},
                "enabled": true,
                "labels": Object {},
                "uid": "some-profile-uid",
                "user": Object {
                  "email": "some@email",
                  "full_name": undefined,
                  "realm_domain": "some-realm-domain",
                  "realm_name": "some-realm",
                  "roles": Array [],
                  "username": "some-username",
                },
              }
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(2);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('fails if activation max retries exceeded', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 409, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);

      // Initial activation attempt.
      const activatePromise = startContract.activate({
        type: 'accessToken',
        accessToken: 'some-token',
      });

      // Re-try 9 more times.
      for (const _ of Array.from({ length: 9 })) {
        await nextTick();
        jest.runAllTimers();
      }

      await expect(activatePromise).rejects.toBe(failureReason);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(10);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('retries activation if initially fails with 503 error', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 503, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
        .mockRejectedValueOnce(failureReason)
        .mockResolvedValueOnce(
          userProfileMock.createWithSecurity() as unknown as SecurityActivateUserProfileResponse
        );

      const startContract = userProfileService.start(mockStartParams);
      const activatePromise = startContract.activate({
        type: 'accessToken',
        accessToken: 'some-token',
      });
      await nextTick();
      jest.runAllTimers();

      await expect(activatePromise).resolves.toMatchInlineSnapshot(`
              Object {
                "data": Object {},
                "enabled": true,
                "labels": Object {},
                "uid": "some-profile-uid",
                "user": Object {
                  "email": "some@email",
                  "full_name": undefined,
                  "realm_domain": "some-realm-domain",
                  "realm_name": "some-realm",
                  "roles": Array [],
                  "username": "some-username",
                },
              }
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(2);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('fails if activation with 503 error exceeds max retries', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 503, body: 'service unavailable' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);

      // Initial activation attempt.
      const activatePromise = startContract.activate({
        type: 'accessToken',
        accessToken: 'some-token',
      });

      // Re-try 9 more times.
      for (const _ of Array.from({ length: 9 })) {
        await nextTick();
        jest.runAllTimers();
      }

      await expect(activatePromise).rejects.toBe(failureReason);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(10);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });

    it('retries activation if fails with both 409 and 503 errors', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });

      const conflict409 = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 409, body: 'conflict' })
      );
      const serviceUnavailable503 = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 503, body: 'service unavailable' })
      );
      mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
        .mockRejectedValueOnce(conflict409)
        .mockRejectedValueOnce(serviceUnavailable503)
        .mockResolvedValueOnce(
          userProfileMock.createWithSecurity() as unknown as SecurityActivateUserProfileResponse
        );

      const startContract = userProfileService.start(mockStartParams);
      const activatePromise = startContract.activate({
        type: 'accessToken',
        accessToken: 'some-token',
      });

      // Wait for first retry (409)
      await nextTick();
      jest.runAllTimers();

      // Wait for second retry (503)
      await nextTick();
      jest.runAllTimers();

      await expect(activatePromise).resolves.toMatchInlineSnapshot(`
              Object {
                "data": Object {},
                "enabled": true,
                "labels": Object {},
                "uid": "some-profile-uid",
                "user": Object {
                  "email": "some@email",
                  "full_name": undefined,
                  "realm_domain": "some-realm-domain",
                  "realm_name": "some-realm",
                  "roles": Array [],
                  "username": "some-username",
                },
              }
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledTimes(3);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.activateUserProfile
      ).toHaveBeenCalledWith({ grant_type: 'access_token', access_token: 'some-token' });
    });
  });

  describe('#bulkGet', () => {
    it('properly parses and sorts returned profiles', async () => {
      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        profiles: [
          userProfileMock.createWithSecurity({
            uid: 'UID-1',
            user: {
              username: 'user-1',
              full_name: 'full-name-1',
              realm_name: 'some-realm',
              realm_domain: 'some-domain',
              roles: ['role-1'],
            },
          }),
          userProfileMock.createWithSecurity({
            uid: 'UID-2',
            user: {
              username: 'user-2',
              full_name: 'full-name-2',
              realm_name: 'some-realm',
              realm_domain: 'some-domain',
              roles: ['role-2'],
            },
          }),
        ],
      } as unknown as SecurityGetUserProfileResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.bulkGet({ uids: new Set(['UID-1', 'UID-2']) })).resolves
        .toMatchInlineSnapshot(`
                        Array [
                          Object {
                            "data": Object {},
                            "enabled": true,
                            "uid": "UID-1",
                            "user": Object {
                              "email": undefined,
                              "full_name": "full-name-1",
                              "username": "user-1",
                            },
                          },
                          Object {
                            "data": Object {},
                            "enabled": true,
                            "uid": "UID-2",
                            "user": Object {
                              "email": undefined,
                              "full_name": "full-name-2",
                              "username": "user-2",
                            },
                          },
                        ]
                    `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID-1,UID-2',
      });
    });

    it('should request data if data path is specified', async () => {
      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        profiles: [
          userProfileMock.createWithSecurity({
            uid: 'UID-1',
            data: { some: 'data', kibana: { some: 'kibana-data' } },
          }),
        ],
      } as unknown as SecurityGetUserProfileResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.bulkGet({ uids: new Set(['UID-1']), dataPath: 'one,two' }))
        .resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data",
                  },
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID-1',
        data: 'kibana.one,kibana.two',
      });
    });

    it('fails if Elasticsearch returns error', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.bulkGet({ uids: new Set(['UID-1', 'UID-2']) })).rejects.toBe(
        failureReason
      );
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: 'UID-1,UID-2',
      });
    });

    it('splits large requests into batches with concurrency control', async () => {
      // Create 75 UIDs to trigger batching (should create 2 batches: 50 + 25)
      const uids = Array.from({ length: 75 }, (_, i) => `UID-${i + 1}`);

      // Mock the first batch (UIDs 1-50)
      const firstBatchProfiles = Array.from({ length: 50 }, (_, i) =>
        userProfileMock.createWithSecurity({
          uid: `UID-${i + 1}`,
          user: {
            username: `user-${i + 1}`,
            full_name: `full-name-${i + 1}`,
            realm_name: 'some-realm',
            realm_domain: 'some-domain',
            roles: ['role-1'],
          },
        })
      );

      // Mock the second batch (UIDs 51-75)
      const secondBatchProfiles = Array.from({ length: 25 }, (_, i) =>
        userProfileMock.createWithSecurity({
          uid: `UID-${i + 51}`,
          user: {
            username: `user-${i + 51}`,
            full_name: `full-name-${i + 51}`,
            realm_name: 'some-realm',
            realm_domain: 'some-domain',
            roles: ['role-1'],
          },
        })
      );

      // Mock getUserProfile to return different responses based on the UID string
      mockStartParams.clusterClient.asInternalUser.security.getUserProfile
        .mockImplementationOnce(() => Promise.resolve({ profiles: firstBatchProfiles } as any))
        .mockImplementationOnce(() => Promise.resolve({ profiles: secondBatchProfiles } as any));

      const startContract = userProfileService.start(mockStartParams);
      const result = await startContract.bulkGet({ uids: new Set(uids) });

      // Verify that getUserProfile was called twice (once for each batch)
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(2);

      // Verify the first batch call (UIDs 1-50)
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenNthCalledWith(1, {
        uid: uids.slice(0, 50).join(','),
      });

      // Verify the second batch call (UIDs 51-75)
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenNthCalledWith(2, {
        uid: uids.slice(50, 75).join(','),
      });

      // Verify all 75 profiles are returned
      expect(result).toHaveLength(75);

      // Verify the results contain profiles from both batches
      expect(result[0].uid).toBe('UID-1');
      expect(result[49].uid).toBe('UID-50');
      expect(result[50].uid).toBe('UID-51');
      expect(result[74].uid).toBe('UID-75');
    });

    it('handles single batch requests efficiently when at batch limit', async () => {
      // Test with exactly 50 UIDs (should not trigger batching)
      const uids = Array.from({ length: 50 }, (_, i) => `UID-${i + 1}`);
      const profiles = uids.map((uid, i) =>
        userProfileMock.createWithSecurity({
          uid,
          user: {
            username: `user-${i + 1}`,
            full_name: `full-name-${i + 1}`,
            realm_name: 'some-realm',
            realm_domain: 'some-domain',
            roles: ['role-1'],
          },
        })
      );

      mockStartParams.clusterClient.asInternalUser.security.getUserProfile.mockResolvedValue({
        profiles,
      } as unknown as SecurityGetUserProfileResponse);

      const startContract = userProfileService.start(mockStartParams);
      const result = await startContract.bulkGet({ uids: new Set(uids) });

      // Verify that getUserProfile was called only once
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(1);

      // Verify the single call contains all 50 UIDs
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledWith({
        uid: uids.join(','),
      });

      // Verify all 50 profiles are returned
      expect(result).toHaveLength(50);
    });

    it('handles errors during batched requests', async () => {
      // Create 75 UIDs to trigger batching (should create 2 batches: 50 + 25)
      const uids = Array.from({ length: 75 }, (_, i) => `UID-${i + 1}`);

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'batch request failed' })
      );

      // Mock the first batch to succeed and second batch to fail
      mockStartParams.clusterClient.asInternalUser.security.getUserProfile
        .mockImplementationOnce(() => Promise.resolve({ profiles: [] } as any))
        .mockImplementationOnce(() => Promise.reject(failureReason));

      const startContract = userProfileService.start(mockStartParams);

      // The entire operation should fail if any batch fails
      await expect(startContract.bulkGet({ uids: new Set(uids) })).rejects.toBe(failureReason);

      // Verify that both batches were attempted
      expect(
        mockStartParams.clusterClient.asInternalUser.security.getUserProfile
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('#suggest', () => {
    it('properly parses returned profiles without privileges check', async () => {
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: [
          userProfileMock.createWithSecurity({
            uid: 'UID-1',
            user: {
              username: 'user-1',
              full_name: 'full-name-1',
              realm_name: 'some-realm',
              realm_domain: 'some-domain',
              roles: ['role-1'],
            },
          }),
          userProfileMock.createWithSecurity({
            uid: 'UID-2',
            user: {
              username: 'user-2',
              full_name: 'full-name-2',
              realm_name: 'some-realm',
              realm_domain: 'some-domain',
              roles: ['role-2'],
            },
          }),
        ],
      } as unknown as SecuritySuggestUserProfilesResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ size: 50, name: 'some' })).resolves
        .toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {},
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "email": undefined,
                    "full_name": "full-name-1",
                    "username": "user-1",
                  },
                },
                Object {
                  "data": Object {},
                  "enabled": true,
                  "uid": "UID-2",
                  "user": Object {
                    "email": undefined,
                    "full_name": "full-name-2",
                    "username": "user-2",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 50,
      });
      expect(mockAuthz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });

    it('should request data if data path is specified', async () => {
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: [
          userProfileMock.createWithSecurity({
            uid: 'UID-1',
            data: { some: 'data', kibana: { some: 'kibana-data' } },
          }),
        ],
      } as unknown as SecuritySuggestUserProfilesResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ name: 'some', dataPath: 'one,two' })).resolves
        .toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data",
                  },
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 10,
        data: 'kibana.one,kibana.two',
      });
      expect(mockAuthz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });

    it('should request data if uid hints are specified', async () => {
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: [
          userProfileMock.createWithSecurity({
            uid: 'UID-1',
          }),
        ],
      } as unknown as SecuritySuggestUserProfilesResponse);

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ hint: { uids: ['UID-1'] } })).resolves
        .toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {},
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        size: 10,
        hint: { uids: ['UID-1'] },
      });
      expect(mockAuthz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });

    it('fails if requested too many suggestions', async () => {
      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ name: 'som', size: 101 })).rejects.toMatchInlineSnapshot(
        `[Error: Can return up to 100 suggestions, but 101 suggestions were requested.]`
      );
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).not.toHaveBeenCalled();
      expect(mockAuthz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });

    it('fails if license does not allow profile collaboration features', async () => {
      userProfileService = new UserProfileService(logger);
      userProfileService.setup({
        authz: mockAuthz,
        license: licenseMock.create({ allowUserProfileCollaboration: false }),
      });

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ name: 'som' })).rejects.toMatchInlineSnapshot(
        `[Error: Current license doesn't support user profile collaboration APIs.]`
      );
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).not.toHaveBeenCalled();
      expect(mockAuthz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });

    it('fails if Elasticsearch suggest API returns error', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: 'some message' })
      );
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockRejectedValue(
        failureReason
      );

      const startContract = userProfileService.start(mockStartParams);
      await expect(startContract.suggest({ name: 'some' })).rejects.toBe(failureReason);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 10,
      });
    });

    it('properly handles privileges checks when privileges can be checked in one go', async () => {
      // In this test we'd like to simulate the following case:
      // 1. User requests 3 results with privileges check
      // 2. Kibana will fetch 10 (min batch) results
      // 3. Only UID-0, UID-1 and UID-8 profiles will have necessary privileges
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: Array.from({ length: 10 }).map((_, index) =>
          userProfileMock.createWithSecurity({
            uid: `UID-${index}`,
            data: { some: 'data', kibana: { some: `kibana-data-${index}` } },
          })
        ),
      } as unknown as SecuritySuggestUserProfilesResponse);

      const mockAtSpacePrivilegeCheck = { atSpace: jest.fn() };
      mockAtSpacePrivilegeCheck.atSpace.mockResolvedValue({
        hasPrivilegeUids: ['UID-0', 'UID-1', 'UID-8'],
      });
      mockAuthz.checkUserProfilesPrivileges.mockReturnValue(mockAtSpacePrivilegeCheck);

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.suggest({
          name: 'some',
          size: 3,
          dataPath: 'one,two',
          requiredPrivileges: {
            spaceId: 'some-space',
            privileges: { kibana: ['privilege-1', 'privilege-2'] },
          },
        })
      ).resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data-0",
                  },
                  "enabled": true,
                  "uid": "UID-0",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
                Object {
                  "data": Object {
                    "some": "kibana-data-1",
                  },
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
                Object {
                  "data": Object {
                    "some": "kibana-data-8",
                  },
                  "enabled": true,
                  "uid": "UID-8",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 10,
        data: 'kibana.one,kibana.two',
      });

      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledTimes(1);
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledWith(
        new Set(Array.from({ length: 10 }).map((_, index) => `UID-${index}`))
      );

      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledTimes(1);
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledWith('some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
    });

    it('properly handles privileges checks when privileges have to be checked in multiple steps', async () => {
      // In this test we'd like to simulate the following case:
      // 1. User requests 11 results with privileges check
      // 2. Kibana will fetch 22 (two times more than requested) results
      // 3. Only UID-0 and UID-21 profiles will have necessary privileges
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: Array.from({ length: 22 }).map((_, index) =>
          userProfileMock.createWithSecurity({
            uid: `UID-${index}`,
            data: { some: 'data', kibana: { some: `kibana-data-${index}` } },
          })
        ),
      } as unknown as SecuritySuggestUserProfilesResponse);

      const mockAtSpacePrivilegeCheck = { atSpace: jest.fn() };
      mockAtSpacePrivilegeCheck.atSpace
        .mockResolvedValueOnce({
          hasPrivilegeUids: ['UID-0'],
        })
        .mockResolvedValueOnce({
          hasPrivilegeUids: ['UID-20'],
        })
        .mockResolvedValueOnce({
          hasPrivilegeUids: [],
        });
      mockAuthz.checkUserProfilesPrivileges.mockReturnValue(mockAtSpacePrivilegeCheck);

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.suggest({
          name: 'some',
          size: 11,
          dataPath: 'one,two',
          requiredPrivileges: {
            spaceId: 'some-space',
            privileges: { kibana: ['privilege-1', 'privilege-2'] },
          },
        })
      ).resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data-0",
                  },
                  "enabled": true,
                  "uid": "UID-0",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
                Object {
                  "data": Object {
                    "some": "kibana-data-20",
                  },
                  "enabled": true,
                  "uid": "UID-20",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 22,
        data: 'kibana.one,kibana.two',
      });

      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledTimes(3);
      // UID-0 -- UID-10 (11 UIDs - number of requested profiles)
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenNthCalledWith(
        1,
        new Set(Array.from({ length: 11 }).map((_, index) => `UID-${index}`))
      );
      // UID-11 -- UID-20 (10 UIDs - min batch size)
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenNthCalledWith(
        2,
        new Set(
          Array.from({ length: 21 })
            .map((_, index) => `UID-${index}`)
            .slice(-10)
        )
      );
      // UID-21 - remaining profile id
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenNthCalledWith(3, new Set(['UID-21']));

      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledTimes(3);
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenNthCalledWith(1, 'some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenNthCalledWith(2, 'some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenNthCalledWith(3, 'some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
    });

    it('properly handles privileges checks when privileges have to be checked in multiple steps and user requested less users than have required privileges', async () => {
      // In this test we'd like to simulate the following case:
      // 1. User requests 2 results with privileges check
      // 2. Kibana will fetch 10 (min batch) results
      // 3. Only UID-0, UID-1 and UID-8 profiles will have necessary privileges
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: Array.from({ length: 10 }).map((_, index) =>
          userProfileMock.createWithSecurity({
            uid: `UID-${index}`,
            data: { some: 'data', kibana: { some: `kibana-data-${index}` } },
          })
        ),
      } as unknown as SecuritySuggestUserProfilesResponse);

      const mockAtSpacePrivilegeCheck = { atSpace: jest.fn() };
      mockAtSpacePrivilegeCheck.atSpace.mockResolvedValue({
        hasPrivilegeUids: ['UID-0', 'UID-1', 'UID-8'],
      });
      mockAuthz.checkUserProfilesPrivileges.mockReturnValue(mockAtSpacePrivilegeCheck);

      const startContract = userProfileService.start(mockStartParams);
      await expect(
        startContract.suggest({
          name: 'some',
          size: 2,
          dataPath: 'one,two',
          requiredPrivileges: {
            spaceId: 'some-space',
            privileges: { kibana: ['privilege-1', 'privilege-2'] },
          },
        })
      ).resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data-0",
                  },
                  "enabled": true,
                  "uid": "UID-0",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
                Object {
                  "data": Object {
                    "some": "kibana-data-1",
                  },
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 10,
        data: 'kibana.one,kibana.two',
      });

      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledTimes(1);
      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledWith(
        new Set(Array.from({ length: 10 }).map((_, index) => `UID-${index}`))
      );

      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledTimes(1);
      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledWith('some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });
    });

    it('properly handles privileges checks and logs errors when errors with reasons are returned from the privilege check', async () => {
      // In this test we'd like to simulate the following case:
      // 1. User requests 2 results with privileges check
      // 2. Kibana will fetch 10 (min batch) results
      // 3. Only UID-0, UID-1 and UID-8 profiles will have necessary privileges
      mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles.mockResolvedValue({
        profiles: Array.from({ length: 10 }).map((_, index) =>
          userProfileMock.createWithSecurity({
            uid: `UID-${index}`,
            data: { some: 'data', kibana: { some: `kibana-data-${index}` } },
          })
        ),
      } as unknown as SecuritySuggestUserProfilesResponse);

      const mockAtSpacePrivilegeCheck = { atSpace: jest.fn() };

      mockAtSpacePrivilegeCheck.atSpace.mockResolvedValue({
        hasPrivilegeUids: ['UID-0', 'UID-1', 'UID-8'],
        errors: {
          count: 2,
          details: {
            'UID-3': { type: 'some type 3', reason: 'some reason 3' },
            'UID-4': { type: 'some type 4', reason: 'some reason 4' },
          },
        },
      });

      mockAuthz.checkUserProfilesPrivileges.mockReturnValue(mockAtSpacePrivilegeCheck);

      const startContract = userProfileService.start(mockStartParams);

      await expect(
        startContract.suggest({
          name: 'some',
          size: 2,
          dataPath: 'one,two',
          requiredPrivileges: {
            spaceId: 'some-space',
            privileges: { kibana: ['privilege-1', 'privilege-2'] },
          },
        })
      ).resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "data": Object {
                    "some": "kibana-data-0",
                  },
                  "enabled": true,
                  "uid": "UID-0",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
                Object {
                  "data": Object {
                    "some": "kibana-data-1",
                  },
                  "enabled": true,
                  "uid": "UID-1",
                  "user": Object {
                    "email": "some@email",
                    "full_name": undefined,
                    "username": "some-username",
                  },
                },
              ]
            `);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledTimes(1);

      expect(
        mockStartParams.clusterClient.asInternalUser.security.suggestUserProfiles
      ).toHaveBeenCalledWith({
        name: 'some',
        size: 10,
        data: 'kibana.one,kibana.two',
      });

      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledTimes(1);

      expect(mockAuthz.checkUserProfilesPrivileges).toHaveBeenCalledWith(
        new Set(Array.from({ length: 10 }).map((_, index) => `UID-${index}`))
      );

      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledTimes(1);

      expect(mockAtSpacePrivilegeCheck.atSpace).toHaveBeenCalledWith('some-space', {
        kibana: ['privilege-1', 'privilege-2'],
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Privileges check API failed for UID UID-3 because some reason 3.'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Privileges check API failed for UID UID-4 because some reason 4.'
      );
    });
  });
});

describe('prefixCommaSeparatedValues', () => {
  it('should prefix each value', () => {
    expect(prefixCommaSeparatedValues('one,two,three', '_')).toBe('_.one,_.two,_.three');
  });

  it('should trim whitespace', () => {
    expect(prefixCommaSeparatedValues('one , two,  three   ', '_')).toBe('_.one,_.two,_.three');
  });

  it('should ignore empty values', () => {
    expect(prefixCommaSeparatedValues('', '_')).toBe('');
    expect(prefixCommaSeparatedValues(' ', '_')).toBe('');
    expect(prefixCommaSeparatedValues(' ,, ', '_')).toBe('');
  });
});
