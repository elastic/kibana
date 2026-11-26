/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';

import { isExternalApiKey } from './is_external_api_key';

describe('isExternalApiKey', () => {
  it.each([
    { internal: false, expected: true },
    { internal: true, expected: false },
    { internal: undefined, expected: false },
  ])('returns $expected when internal is $internal', ({ internal, expected }) => {
    expect(
      isExternalApiKey(
        mockAuthenticatedUser({
          authentication_type: 'api_key',
          api_key: { id: 'key-id', name: 'key-name', managed_by: 'cloud', internal },
        })
      )
    ).toBe(expected);
  });

  it('does not classify a session user as an external API key', () => {
    expect(isExternalApiKey(mockAuthenticatedUser())).toBe(false);
  });

  it('does not classify an unavailable user as an external API key', () => {
    expect(isExternalApiKey(null)).toBe(false);
  });

  it('does not classify an Elasticsearch API key without internal metadata as external', () => {
    expect(
      isExternalApiKey(
        mockAuthenticatedUser({
          authentication_type: 'api_key',
          api_key: { id: 'key-id', name: 'key-name', managed_by: 'elasticsearch' },
        })
      )
    ).toBe(false);
  });
});
