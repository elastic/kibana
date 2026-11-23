/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addCloudApiKeyAuthErrorGuidance,
  CLOUD_API_KEY_AUTH_ERROR_GUIDANCE,
} from './cloud_api_key_auth_error_guidance';

describe('addCloudApiKeyAuthErrorGuidance', () => {
  it.each(['0x28D520', '0xD38358', '0xE436AE'])(
    'prepends guidance when the message reports a cloud API key auth failure with code %s',
    (code) => {
      const message = `security_exception: failed to authenticate cloud API key: [${code}]`;
      expect(addCloudApiKeyAuthErrorGuidance(message)).toBe(
        `${CLOUD_API_KEY_AUTH_ERROR_GUIDANCE} ${message}`
      );
    }
  );

  it('prepends guidance when the phrase is embedded in a larger flattened error message', () => {
    const message =
      'Error fetching rule execution settings: ResponseError: security_exception\n\tCaused by:\n\t\tsecurity_exception: failed to authenticate cloud API key: [0xD38358]';
    expect(addCloudApiKeyAuthErrorGuidance(message)).toBe(
      `${CLOUD_API_KEY_AUTH_ERROR_GUIDANCE} ${message}`
    );
  });

  it('returns other error messages unchanged', () => {
    const message = 'security_exception: unable to authenticate user [elastic]';
    expect(addCloudApiKeyAuthErrorGuidance(message)).toBe(message);
  });

  it('does not match a bare error code without the full phrase', () => {
    const message = 'rule query matched document mentioning 0x28D520';
    expect(addCloudApiKeyAuthErrorGuidance(message)).toBe(message);
  });

  it('does not match the phrase with an unrelated error code', () => {
    const message = 'failed to authenticate cloud API key: [0xABCDEF]';
    expect(addCloudApiKeyAuthErrorGuidance(message)).toBe(message);
  });
});
