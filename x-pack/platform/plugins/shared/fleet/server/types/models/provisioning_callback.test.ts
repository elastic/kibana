/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvisioningCallbackSchemaV1 } from './provisioning_callback';

describe('ProvisioningCallbackSchemaV1', () => {
  const record = {
    provider: 'aws',
    status: 'pending',
    created_at: '2026-11-23T10:00:00.000Z',
    expires_at: '2026-11-23T12:00:00.000Z',
    token_hash: 'a'.repeat(64),
  };

  it('stores a record of any cloud provider, since the provider is the record discriminator', () => {
    for (const provider of ['aws', 'azure', 'gcp']) {
      expect(ProvisioningCallbackSchemaV1.validate({ ...record, provider })).toEqual({
        ...record,
        provider,
      });
    }
  });

  it('rejects a provider that is not a cloud provider', () => {
    expect(() => ProvisioningCallbackSchemaV1.validate({ ...record, provider: 'lambda' })).toThrow(
      /provider/
    );
  });
});
