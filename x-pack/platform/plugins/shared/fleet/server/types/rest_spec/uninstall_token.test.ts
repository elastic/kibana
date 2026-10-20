/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetUninstallTokenResponseSchema,
  GetUninstallTokensMetadataRequestSchema,
  RotateUninstallTokenRequestSchema,
} from './uninstall_token';

describe('schema field length limits', () => {
  // These two filters are partial-match terms expanded into an Elasticsearch
  // `regexp` / `query_string` query, so they keep the 50 character limit they had
  // before the string helpers were adopted rather than widening to the
  // savedObjectId default of 512.
  describe.each(['policyId', 'search'])('GetUninstallTokensMetadataRequestSchema.%s', (field) => {
    it('accepts a value at exactly 50 characters', () => {
      expect(() =>
        GetUninstallTokensMetadataRequestSchema.query.validate({ [field]: 'a'.repeat(50) })
      ).not.toThrow();
    });

    it('rejects a value over 50 characters', () => {
      expect(() =>
        GetUninstallTokensMetadataRequestSchema.query.validate({ [field]: 'a'.repeat(51) })
      ).toThrow();
    });
  });

  describe('RotateUninstallTokenRequestSchema.agentPolicyId', () => {
    it('accepts an agent policy ID at exactly 255 characters', () => {
      expect(() =>
        RotateUninstallTokenRequestSchema.params.validate({ agentPolicyId: 'a'.repeat(255) })
      ).not.toThrow();
    });

    it('rejects an agent policy ID over 255 characters', () => {
      expect(() =>
        RotateUninstallTokenRequestSchema.params.validate({ agentPolicyId: 'a'.repeat(256) })
      ).toThrow();
    });
  });
});

describe('UninstallTokenMetadataSchema.namespaces', () => {
  // These are Kibana Space IDs copied from the agent policy's `space_ids`, not data
  // stream namespaces, so they take the 512 character spaceId limit rather than the
  // 100 byte data stream namespace limit.
  const item = (namespaces: string[]) => ({
    item: {
      id: 'token-1',
      policy_id: 'policy-1',
      created_at: '2026-10-20T00:00:00.000Z',
      token: 'abc123',
      namespaces,
    },
  });

  it('accepts a space ID longer than the data stream namespace limit', () => {
    expect(() => GetUninstallTokenResponseSchema.validate(item(['a'.repeat(101)]))).not.toThrow();
  });

  it('accepts a space ID at exactly 512 characters', () => {
    expect(() => GetUninstallTokenResponseSchema.validate(item(['a'.repeat(512)]))).not.toThrow();
  });

  it('rejects a space ID over 512 characters', () => {
    expect(() => GetUninstallTokenResponseSchema.validate(item(['a'.repeat(513)]))).toThrow();
  });
});
