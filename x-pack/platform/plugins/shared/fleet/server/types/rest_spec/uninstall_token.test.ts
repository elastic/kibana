/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
