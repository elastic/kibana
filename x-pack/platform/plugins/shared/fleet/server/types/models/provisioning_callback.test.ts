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

  it('stores an AWS record', () => {
    expect(ProvisioningCallbackSchemaV1.validate(record)).toEqual(record);
  });

  it('is the shipped model version, so it still knows AWS records only', () => {
    // A released model version is immutable: the first non-AWS provider adds model version 2.
    for (const provider of ['azure', 'gcp', 'lambda']) {
      expect(() => ProvisioningCallbackSchemaV1.validate({ ...record, provider })).toThrow(
        /provider/
      );
    }
  });
});
