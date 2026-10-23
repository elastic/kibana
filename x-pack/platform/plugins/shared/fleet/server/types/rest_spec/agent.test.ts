/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPolicyBaseIdsWithFallbackKuery } from '../../../common/services';
import { AGENTS_PREFIX } from '../../constants';

import {
  GetAgentsRequestSchema,
  PostNewAgentActionResponseSchema,
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

describe('KQL fields in reporting mode', () => {
  // KQL fields use searchFilter.warn(): Fleet's own UI generates queries that inline every
  // managed policy ID, so a hard limit would reject them. Overlong input is recorded in the
  // kibana.schema.string_length_violation.length histogram instead of being rejected.
  it.each([10_000, 10_001, 50_000])('accepts a kuery of %i characters', (length) => {
    expect(() =>
      GetAgentsRequestSchema.query.validate({ kuery: 'a'.repeat(length) })
    ).not.toThrow();
  });

  it('accepts an overlong KQL string in the agents field of a bulk action', () => {
    expect(() =>
      PostBulkAgentUnenrollRequestSchema.body.validate({ agents: 'a'.repeat(50_000) })
    ).not.toThrow();
  });

  // Regression: the Agents list page builds one kuery from every managed agent policy ID,
  // inlined twice by buildPolicyBaseIdsWithFallbackKuery. At ~124 policies that exceeds
  // 10 000 characters, so a hard limit would 400 the page on load.
  it('accepts the kuery the Agents list page builds for 500 managed policies', () => {
    const ids = Array.from(
      { length: 500 },
      (_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`
    );
    const kuery = buildPolicyBaseIdsWithFallbackKuery(
      ids,
      `${AGENTS_PREFIX}.policy_base_id`,
      `${AGENTS_PREFIX}.policy_id`
    );

    expect(kuery.length).toBeGreaterThan(10_000);
    expect(() => GetAgentsRequestSchema.query.validate({ kuery })).not.toThrow();
  });

  it('still applies KQL validation to the kuery field', () => {
    expect(() => GetAgentsRequestSchema.query.validate({ kuery: 'not_a_field: 1' })).toThrow();
  });
});

describe('schema field length limits', () => {
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

describe('namespaces are Kibana Space IDs', () => {
  // Agent `namespaces` hold Space IDs (see the space-awareness filter in
  // services/agents/crud.ts), so they take the 512 character spaceId limit rather than
  // the 100 byte data stream namespace limit.
  const action = (namespaces: string[]) => ({
    item: { id: 'action-1', type: 'UPGRADE', created_at: '2026-10-20T00:00:00.000Z', namespaces },
  });

  it('accepts a space ID longer than the data stream namespace limit', () => {
    expect(() =>
      PostNewAgentActionResponseSchema.validate(action(['a'.repeat(101)]))
    ).not.toThrow();
  });

  it('rejects a space ID over 512 characters', () => {
    expect(() => PostNewAgentActionResponseSchema.validate(action(['a'.repeat(513)]))).toThrow();
  });
});
