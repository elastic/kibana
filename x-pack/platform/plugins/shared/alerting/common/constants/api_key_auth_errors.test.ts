/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_KEY_AUTH_ERROR_MESSAGE_REGEX, getApiKeyAuthErrorKind } from './api_key_auth_errors';

describe('getApiKeyAuthErrorKind', () => {
  it('detects UIAM error codes embedded in the execution error message', () => {
    expect(
      getApiKeyAuthErrorKind(
        'security_exception: failed to authenticate cloud API key: [0x28D520], caused by: "failed to authenticate cloud API key: [0x28D520]"'
      )
    ).toBe('missing');
    expect(getApiKeyAuthErrorKind('... [0xD38358] ...')).toBe('revoked');
    expect(getApiKeyAuthErrorKind('... [0x7E0116] ...')).toBe('expired');
    expect(
      getApiKeyAuthErrorKind(
        'security_exception: failed to authenticate cloud API key: [0xE436AE], caused by: "failed to authenticate cloud API key: [0xE436AE]"'
      )
    ).toBe('expired');
  });

  it('detects Elasticsearch API key rejections without a UIAM code', () => {
    expect(getApiKeyAuthErrorKind('security_exception: api key has been invalidated')).toBe(
      'revoked'
    );
    expect(getApiKeyAuthErrorKind('security_exception: API key is expired')).toBe('expired');
    expect(
      getApiKeyAuthErrorKind(
        'security_exception: unable to authenticate with provided credentials and anonymous access is not allowed for this request'
      )
    ).toBe('rejected');
    expect(getApiKeyAuthErrorKind('failed to authenticate cloud API key: [0xFFFFFF]')).toBe(
      'rejected'
    );
  });

  it('returns undefined for unrelated messages', () => {
    expect(getApiKeyAuthErrorKind(undefined)).toBeUndefined();
    expect(getApiKeyAuthErrorKind(null)).toBeUndefined();
    expect(getApiKeyAuthErrorKind('')).toBeUndefined();
    expect(
      getApiKeyAuthErrorKind('index_not_found_exception: no such index [foo]')
    ).toBeUndefined();
  });
});

describe('API_KEY_AUTH_ERROR_MESSAGE_REGEX', () => {
  it('matches whole messages containing any marker and nothing else', () => {
    const regex = new RegExp(`^${API_KEY_AUTH_ERROR_MESSAGE_REGEX}$`);
    expect(regex.test('security_exception: failed to authenticate cloud API key: [0x28D520]')).toBe(
      true
    );
    expect(regex.test('security_exception: api key has been invalidated')).toBe(true);
    expect(regex.test('index_not_found_exception: no such index [foo]')).toBe(false);
  });
});
