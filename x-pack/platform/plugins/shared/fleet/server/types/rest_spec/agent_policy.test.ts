/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CopyAgentPolicyRequestSchema, GetAgentPoliciesRequestSchema } from './agent_policy';

describe('GetAgentPoliciesRequestSchema.query', () => {
  it('should default showAgentless to true', () => {
    expect(GetAgentPoliciesRequestSchema.query.validate({}).showAgentless).toBe(true);
  });

  it('should accept showAgentless being false', () => {
    expect(
      GetAgentPoliciesRequestSchema.query.validate({ showAgentless: false }).showAgentless
    ).toBe(false);
  });

  it('should reject a non boolean showAgentless', () => {
    expect(() => GetAgentPoliciesRequestSchema.query.validate({ showAgentless: 'no' })).toThrow();
  });

  it('should work without query parameters', () => {
    expect(() => GetAgentPoliciesRequestSchema.query.validate({})).not.toThrow();
  });

  it('should work with perPage being less than 100', () => {
    expect(() => GetAgentPoliciesRequestSchema.query.validate({ perPage: 50 })).not.toThrow();
  });

  it('should work with perPage being more than 100', () => {
    expect(() => GetAgentPoliciesRequestSchema.query.validate({ perPage: 500 })).not.toThrow();
  });

  it('should work with perPage being less than 100 and agentCount and full', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({ perPage: 50, full: true, noAgentCount: false })
    ).not.toThrow();
  });

  it('should work with perPage being less than 100 and agentCount', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({ perPage: 50, noAgentCount: true })
    ).not.toThrow();
  });

  it('should work with perPage being less than 100 and no agentCount and full', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({ perPage: 50, full: true, noAgentCount: false })
    ).not.toThrow();
  });

  it('should throw with perPage being more than 100 and noagentCount', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({
        perPage: 500,
        noAgentCount: false,
      })
    ).toThrow(/perPage should be less or equal to 100 when fetching full policies or agent count./);
  });

  it('should throw with perPage being more than 100 and withAgentCount', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({
        perPage: 500,
        withAgentCount: true,
      })
    ).toThrow(/perPage should be less or equal to 100 when fetching full policies or agent count./);
  });

  it('should throw without perPage being more than 100 and full', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({
        perPage: 500,
        noAgentCount: true,
        full: true,
      })
    ).toThrow(/perPage should be less or equal to 100 when fetching full policies or agent count./);
  });

  it('should not throw with perPage being more than 100 and no agentCount and no full', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({
        perPage: 500,
        full: false,
        noAgentCount: true,
      })
    ).not.toThrow();
  });
});

describe('reporting mode string fields', () => {
  // These fields use the string helpers' warn() mode: overlong input is recorded in the
  // kibana.schema.string_length_violation.length histogram instead of being rejected.
  it.each([10_000, 10_001, 50_000])('accepts a kuery of %i characters', (length) => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({ kuery: 'a'.repeat(length) })
    ).not.toThrow();
  });

  it('still applies KQL validation to the kuery field', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({ kuery: 'not_a_field: 1' })
    ).toThrow();
  });

  it('accepts an overlong agentPolicyId', () => {
    expect(() =>
      CopyAgentPolicyRequestSchema.params.validate({ agentPolicyId: 'a'.repeat(1000) })
    ).not.toThrow();
  });

  it('accepts an overlong name and description when copying a policy', () => {
    expect(() =>
      CopyAgentPolicyRequestSchema.body.validate({
        name: 'a'.repeat(1000),
        description: 'a'.repeat(20_000),
      })
    ).not.toThrow();
  });

  it('still requires a non-empty name when copying a policy', () => {
    expect(() => CopyAgentPolicyRequestSchema.body.validate({ name: '' })).toThrow();
  });
});
