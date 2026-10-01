/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toElasticsearchQuery } from '@kbn/es-query';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import type { ReportingUserIdentity } from '../../../lib';
import { getReportingUserIdentity } from '../../../lib';
import { buildOwnedByFilter, isScheduledReportOwner } from './ownership';

const NATIVE_ID = 'realm:["native","default_native","rshared"]';
const FILE_ID = 'realm:["file","default_file","rshared"]';

const asUser = (overrides: Partial<ReportingUserIdentity> = {}): ReportingUserIdentity => ({
  ids: ['profile-123', NATIVE_ID],
  username: 'rshared',
  ...overrides,
});

const asApiKey = (overrides: Partial<ReportingUserIdentity> = {}): ReportingUserIdentity => ({
  ...asUser(),
  apiKeyId: 'api-key-1',
  ...overrides,
});

describe('isScheduledReportOwner', () => {
  describe('acting through a session', () => {
    it('preserves ownership of a hashed realm identity while denying a same-username user in another realm', async () => {
      const username = '"'.repeat(500);
      const esClient = elasticsearchServiceMock.createClusterClient();
      const request = httpServerMock.createKibanaRequest();
      const owner = mockAuthenticatedUser({
        username,
        profile_uid: undefined,
        lookup_realm: { type: 'native', name: 'default_native' },
      });
      const creator = await getReportingUserIdentity({ user: owner, request, esClient });
      const returningOwner = await getReportingUserIdentity({
        user: { ...owner, profile_uid: 'new-profile' },
        request,
        esClient,
      });
      const otherUser = await getReportingUserIdentity({
        user: { ...owner, lookup_realm: { type: 'file', name: 'default_file' } },
        request,
        esClient,
      });
      const report = { createdBy: username, createdById: creator.ids };

      expect(creator.ids[0]).toHaveLength(77);
      expect(isScheduledReportOwner({ report, currentUser: returningOwner })).toBe(true);
      expect(isScheduledReportOwner({ report, currentUser: otherUser })).toBe(false);
    });

    it('matches when the stored id equals the current user id', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared', createdById: ['profile-123'] },
          currentUser: asUser(),
        })
      ).toBe(true);
    });

    it('matches a document stored under the realm-qualified id when the profile uid is now preferred', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared', createdById: [NATIVE_ID] },
          currentUser: asUser(),
        })
      ).toBe(true);
    });

    it('matches a document recording both representations when only the realm-qualified id resolves', () => {
      // Run-as requests can resolve only the realm ID.
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared', createdById: ['profile-123', NATIVE_ID] },
          currentUser: asUser({ ids: [NATIVE_ID] }),
        })
      ).toBe(true);
    });

    it('cannot match a document that recorded only a profile uid from a request without one', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared', createdById: ['profile-123'] },
          currentUser: asUser({ ids: [NATIVE_ID] }),
        })
      ).toBe(false);
    });

    it('does not match when the stored id differs, even for the same username (cross-realm collision)', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared', createdById: [FILE_ID] },
          currentUser: asUser({ ids: [NATIVE_ID] }),
        })
      ).toBe(false);
    });

    it('does not fall back to username matching once a document has a stored id', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared', createdById: [FILE_ID] },
          currentUser: asUser({ ids: [] }),
        })
      ).toBe(false);
    });

    it('reaches a document created by one of their api keys', () => {
      expect(
        isScheduledReportOwner({
          report: {
            createdBy: 'rshared',
            createdById: ['profile-123'],
            createdByApiKeyId: 'api-key-1',
          },
          currentUser: asUser(),
        })
      ).toBe(true);
    });

    it.each([asUser(), asUser({ ids: [FILE_ID] }), asUser({ ids: [] })])(
      'denies a key-only document to a same-username human with identity %j',
      (currentUser) => {
        expect(
          isScheduledReportOwner({
            report: { createdBy: 'rshared', createdByApiKeyId: 'api-key-1' },
            currentUser,
          })
        ).toBe(false);
      }
    );

    it.each([asUser(), asUser({ ids: [FILE_ID] }), asUser({ ids: [] })])(
      'denies legacy documents to a same-username human with identity %j',
      (currentUser) => {
        expect(
          isScheduledReportOwner({
            report: { createdBy: 'rshared' },
            currentUser,
          })
        ).toBe(false);
      }
    );

    it('denies a legacy document when usernames differ', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'someone-else' },
          currentUser: asUser(),
        })
      ).toBe(false);
    });

    it('denies when neither an id nor a username is available', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared' },
          currentUser: { ids: [] },
        })
      ).toBe(false);
    });
  });

  describe('acting through an api key', () => {
    it('restricts a key-derived bearer token to its own key even when human ownership ids match', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient();
      esClient.asScoped().asCurrentUser.security.getApiKey.mockResponse({
        api_keys: [
          {
            id: 'api-key-2',
            name: 'second key',
            type: 'rest',
            metadata: {},
            creation: 0,
            invalidated: false,
            username: 'rshared',
            realm: 'default_native',
            realm_type: 'native',
            profile_uid: 'profile-123',
          },
        ],
      });
      const currentUser = await getReportingUserIdentity({
        user: mockAuthenticatedUser({
          username: 'rshared',
          profile_uid: undefined,
          authentication_type: 'token',
          lookup_realm: { type: '_es_api_key', name: '_es_api_key' },
          api_key: { id: 'api-key-2', name: 'second key', managed_by: 'elasticsearch' },
        }),
        request: httpServerMock.createKibanaRequest({
          headers: { authorization: 'Bearer access-token' },
        }),
        esClient,
      });
      const report = { createdBy: 'rshared', createdById: ['profile-123', NATIVE_ID] };

      expect(
        isScheduledReportOwner({
          report: { ...report, createdByApiKeyId: 'api-key-2' },
          currentUser,
        })
      ).toBe(true);
      expect(
        isScheduledReportOwner({
          report: { ...report, createdByApiKeyId: 'api-key-1' },
          currentUser,
        })
      ).toBe(false);
      expect(isScheduledReportOwner({ report, currentUser })).toBe(false);
    });

    it('matches a document the key created even when its human owner could not be resolved', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared', createdByApiKeyId: 'api-key-1' },
          currentUser: asApiKey({ ids: [] }),
        })
      ).toBe(true);
    });

    it('matches a document the key created', () => {
      expect(
        isScheduledReportOwner({
          report: {
            createdBy: 'rshared',
            createdById: ['profile-123'],
            createdByApiKeyId: 'api-key-1',
          },
          currentUser: asApiKey(),
        })
      ).toBe(true);
    });

    it('does not reach a document created by another key of the same owner', () => {
      expect(
        isScheduledReportOwner({
          report: {
            createdBy: 'rshared',
            createdById: ['profile-123'],
            createdByApiKeyId: 'api-key-2',
          },
          currentUser: asApiKey(),
        })
      ).toBe(false);
    });

    it('does not reach a document its owner created through a session', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared', createdById: ['profile-123'] },
          currentUser: asApiKey(),
        })
      ).toBe(false);
    });

    it('denies legacy documents even when the key owner username matches', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'rshared' },
          currentUser: asApiKey(),
        })
      ).toBe(false);
    });

    it('denies a legacy document belonging to a different username', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'someone-else' },
          currentUser: asApiKey(),
        })
      ).toBe(false);
    });
  });

  describe('UIAM api keys, whose creator cannot be resolved', () => {
    const uiamKey: ReportingUserIdentity = {
      ids: [],
      apiKeyId: 'uiam-key-id',
      username: 'uiam-key-id',
    };

    it('matches the documents the key created', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'uiam-key-id', createdByApiKeyId: 'uiam-key-id' },
          currentUser: uiamKey,
        })
      ).toBe(true);
    });

    it('does not let a human reach a UIAM-key document, since no owner was recorded', () => {
      expect(
        isScheduledReportOwner({
          report: { createdBy: 'uiam-key-id', createdByApiKeyId: 'uiam-key-id' },
          currentUser: asUser({ username: 'uiam-key-id' }),
        })
      ).toBe(false);
    });
  });
});

describe('buildOwnedByFilter', () => {
  it.each([{ ids: [] }, { ids: [], username: 'rshared' }])(
    'returns undefined when the identity has no ownership IDs: %j',
    (identity) => {
      expect(buildOwnedByFilter(identity)).toBeUndefined();
    }
  );

  it('matches only stable IDs for a session, excluding legacy and key-only reports', () => {
    const node = buildOwnedByFilter(asUser());
    if (!node) {
      throw new Error('Expected an ownership filter');
    }
    expect(toElasticsearchQuery(node)).toEqual({
      bool: {
        should: ['profile-123', NATIVE_ID].map((id) => ({
          bool: {
            should: [{ match: { 'scheduled_report.attributes.createdById': id } }],
            minimum_should_match: 1,
          },
        })),
        minimum_should_match: 1,
      },
    });
  });

  it('builds an ID clause without a username', () => {
    expect(buildOwnedByFilter({ ids: ['profile-123'] })).toMatchObject({
      type: 'function',
      function: 'is',
    });
  });

  it('restricts API keys to their own reports, excluding legacy reports and other owner IDs', () => {
    const node = buildOwnedByFilter(asApiKey());
    if (!node) {
      throw new Error('Expected an ownership filter');
    }
    expect(toElasticsearchQuery(node)).toEqual({
      bool: {
        should: [{ match: { 'scheduled_report.attributes.createdByApiKeyId': 'api-key-1' } }],
        minimum_should_match: 1,
      },
    });
  });

  it.each([asUser(), asApiKey(), asUser({ ids: [] })])(
    'never uses the username to authorize listings for %j',
    (identity) => {
      expect(buildOwnedByFilter(identity)).toEqual(
        buildOwnedByFilter({ ...identity, username: 'different"user*[name]' })
      );
    }
  );

  it('matches a realm-qualified ID containing quotes and brackets exactly', () => {
    const node = buildOwnedByFilter({ ids: [FILE_ID], username: 'rshared' });
    if (!node) {
      throw new Error('Expected an ownership filter');
    }
    expect(toElasticsearchQuery(node)).toEqual({
      bool: {
        should: [{ match: { 'scheduled_report.attributes.createdById': FILE_ID } }],
        minimum_should_match: 1,
      },
    });
  });
});
