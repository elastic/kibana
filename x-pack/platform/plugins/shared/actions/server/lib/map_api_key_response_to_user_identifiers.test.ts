/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_CLOUD_SSO_REALM_NAME,
  mapFirstApiKeyToUserIdentifiers,
} from './map_api_key_response_to_user_identifiers';

describe('mapFirstApiKeyToUserIdentifiers', () => {
  it('returns both profileUid and userCloudId when the realm is Elastic Cloud SSO', () => {
    expect(
      mapFirstApiKeyToUserIdentifiers([
        {
          profile_uid: 'profile-1',
          username: 'cloud-user',
          realm: ELASTIC_CLOUD_SSO_REALM_NAME,
        },
      ])
    ).toEqual({ profileUid: 'profile-1', userCloudId: 'cloud-user' });
  });

  it('returns profileUid only when the realm is not Elastic Cloud SSO', () => {
    expect(
      mapFirstApiKeyToUserIdentifiers([
        {
          profile_uid: 'profile-1',
          username: 'native-user',
          realm: 'default_native',
        },
      ])
    ).toEqual({ profileUid: 'profile-1', userCloudId: undefined });
  });

  it('returns userCloudId from cloud realm username when profile_uid is absent', () => {
    expect(
      mapFirstApiKeyToUserIdentifiers([
        {
          username: 'cloud-only',
          realm: ELASTIC_CLOUD_SSO_REALM_NAME,
        },
      ])
    ).toEqual({ profileUid: undefined, userCloudId: 'cloud-only' });
  });

  it('returns undefined when api_keys is empty', () => {
    expect(mapFirstApiKeyToUserIdentifiers([])).toBeUndefined();
  });

  it('returns undefined when api_keys is undefined', () => {
    expect(mapFirstApiKeyToUserIdentifiers(undefined)).toBeUndefined();
  });

  it('returns undefined when the first key has neither profile nor cloud id', () => {
    expect(
      mapFirstApiKeyToUserIdentifiers([
        { profile_uid: undefined, username: 'u', realm: 'default_native' },
      ])
    ).toBeUndefined();
  });
});
