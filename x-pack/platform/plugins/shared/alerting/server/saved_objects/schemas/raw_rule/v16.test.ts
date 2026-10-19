/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawRuleSchema } from './v16';

describe('rawRuleSchemaV16', () => {
  const baseRule = {
    name: 'my rule',
    enabled: true,
    consumer: 'alerts',
    tags: [],
    alertTypeId: '.test',
    apiKeyOwner: 'elastic',
    apiKey: null,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    updatedAt: '2024-01-02T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    muteAll: false,
    mutedInstanceIds: [],
    throttle: null,
    revision: 0,
    schedule: {
      interval: '1m',
    },
    legacyId: null,
    actions: [],
    executionStatus: {
      status: 'pending' as const,
      lastExecutionDate: '2024-01-01T00:00:00.000Z',
      error: null,
      warning: null,
    },
    params: {},
  };

  it('keeps older documents valid when the profile uid fields are absent', () => {
    expect(() => rawRuleSchema.validate(baseRule)).not.toThrow();
  });

  it('accepts createdByProfileUid and updatedByProfileUid as strings', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      createdByProfileUid: 'u_profile_created',
      updatedByProfileUid: 'u_profile_updated',
    });

    expect(validated.createdByProfileUid).toBe('u_profile_created');
    expect(validated.updatedByProfileUid).toBe('u_profile_updated');
  });

  it('accepts createdByProfileUid and updatedByProfileUid as null', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      createdByProfileUid: null,
      updatedByProfileUid: null,
    });

    expect(validated.createdByProfileUid).toBeNull();
    expect(validated.updatedByProfileUid).toBeNull();
  });

  it('rejects a non-string, non-null createdByProfileUid', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        createdByProfileUid: 123,
      })
    ).toThrow();
  });

  it('rejects a non-string, non-null updatedByProfileUid', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        updatedByProfileUid: 123,
      })
    ).toThrow();
  });

  it('accepts apiKeyOwnerProfileUid as a string', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      apiKeyOwnerProfileUid: 'u_profile_api_key_owner',
    });

    expect(validated.apiKeyOwnerProfileUid).toBe('u_profile_api_key_owner');
  });

  it('accepts apiKeyOwnerProfileUid as null', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      apiKeyOwnerProfileUid: null,
    });

    expect(validated.apiKeyOwnerProfileUid).toBeNull();
  });

  it('rejects a non-string, non-null apiKeyOwnerProfileUid', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        apiKeyOwnerProfileUid: 123,
      })
    ).toThrow();
  });
});
