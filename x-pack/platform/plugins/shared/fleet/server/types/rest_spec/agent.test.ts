/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetAgentsRequestSchema,
  PostBulkAgentUnenrollRequestSchema,
  PostBulkAgentReassignRequestSchema,
} from './agent';

describe('GetAgentsRequestSchema', () => {
  it('should allow pagination with less than 10000 agents', () => {
    expect(() =>
      GetAgentsRequestSchema.query.validate({
        page: 500,
        perPage: 20,
      })
    ).not.toThrow();
  });
  it('should not allow pagination to go over 10000 agents', () => {
    expect(() =>
      GetAgentsRequestSchema.query.validate({
        page: 501,
        perPage: 20,
      })
    ).toThrow(/You cannot use page and perPage page over 10000 agents/);
  });
});

describe('schema field length limits', () => {
  it('rejects a KQL query string over 10 000 characters', () => {
    expect(() => GetAgentsRequestSchema.query.validate({ kuery: 'a'.repeat(10_001) })).toThrow();
  });

  it('accepts a KQL query string at exactly 10 000 characters', () => {
    expect(() =>
      GetAgentsRequestSchema.query.validate({ kuery: 'a'.repeat(10_000) })
    ).not.toThrow();
  });

  it('rejects an agent ID in bulk unenroll that is over 512 characters', () => {
    expect(() =>
      PostBulkAgentUnenrollRequestSchema.body.validate({
        agents: ['a'.repeat(513)],
      })
    ).toThrow();
  });

  it('rejects a policy_id in bulk reassign that is over 512 characters', () => {
    expect(() =>
      PostBulkAgentReassignRequestSchema.body.validate({
        policy_id: 'a'.repeat(513),
        agents: ['valid-id'],
      })
    ).toThrow();
  });
});
