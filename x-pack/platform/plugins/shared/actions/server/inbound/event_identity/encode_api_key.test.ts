/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasInboundEventIdentityAttributes } from './encode_api_key';

describe('hasInboundEventIdentityAttributes', () => {
  it('is true only when the unencrypted presence flag is set', () => {
    expect(hasInboundEventIdentityAttributes({ hasInboundEventIdentity: true })).toBe(true);
  });

  it('is false when the flag is missing, even if encrypted key fields are present', () => {
    expect(hasInboundEventIdentityAttributes({})).toBe(false);
    expect(hasInboundEventIdentityAttributes({ hasInboundEventIdentity: false })).toBe(false);
    expect(
      hasInboundEventIdentityAttributes({
        hasInboundEventIdentity: false,
        apiKey: 'stored',
        uiamApiKey: 'uiam',
      } as { hasInboundEventIdentity: boolean })
    ).toBe(false);
  });
});
