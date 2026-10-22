/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetAgentsRequestSchema } from './agent';

import {
  PostBulkAgentUnenrollRequestSchema,
  PostBulkAgentUpgradeRequestSchema,
  PostBulkRequestDiagnosticsActionRequestSchema,
  PostBulkAgentReassignRequestSchema,
  BulkMigrateAgentsRequestSchema,
  PostBulkUpdateAgentTagsRequestSchema,
  BulkChangeAgentsPrivilegeLevelRequestSchema,
  PostBulkAgentRollbackRequestSchema,
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

describe('bulk action request schemas reject KQL on credential fields in the `agents` body field', () => {
  // Fields each schema requires besides `agents`, so the assertions below only exercise the
  // `agents` validator rather than tripping over unrelated required fields.
  const bulkSchemas: Array<
    [string, { body: { validate: (value: unknown) => void } }, Record<string, unknown>]
  > = [
    ['PostBulkAgentUnenrollRequestSchema', PostBulkAgentUnenrollRequestSchema, {}],
    ['PostBulkAgentUpgradeRequestSchema', PostBulkAgentUpgradeRequestSchema, { version: '9.4.1' }],
    [
      'PostBulkRequestDiagnosticsActionRequestSchema',
      PostBulkRequestDiagnosticsActionRequestSchema,
      {},
    ],
    [
      'PostBulkAgentReassignRequestSchema',
      PostBulkAgentReassignRequestSchema,
      { policy_id: 'policy-1' },
    ],
    [
      'BulkMigrateAgentsRequestSchema',
      BulkMigrateAgentsRequestSchema,
      { uri: 'http://example.com', enrollment_token: 'token-1' },
    ],
    ['PostBulkUpdateAgentTagsRequestSchema', PostBulkUpdateAgentTagsRequestSchema, {}],
    [
      'BulkChangeAgentsPrivilegeLevelRequestSchema',
      BulkChangeAgentsPrivilegeLevelRequestSchema,
      {},
    ],
    ['PostBulkAgentRollbackRequestSchema', PostBulkAgentRollbackRequestSchema, {}],
  ];

  it.each(bulkSchemas)(
    '%s rejects default_api_key in the agents KQL string',
    (_name, schema, extra) => {
      expect(() => schema.body.validate({ agents: 'default_api_key:d*', ...extra })).toThrow(
        /not allowed/
      );
    }
  );

  it.each(bulkSchemas)(
    '%s rejects access_api_key in the agents KQL string',
    (_name, schema, extra) => {
      expect(() => schema.body.validate({ agents: 'access_api_key:d*', ...extra })).toThrow(
        /not allowed/
      );
    }
  );

  it.each(bulkSchemas)('%s still allows a legitimate agents KQL string', (_name, schema, extra) => {
    expect(() => schema.body.validate({ agents: 'status:online', ...extra })).not.toThrow();
  });

  it.each(bulkSchemas)('%s still allows an array of agent IDs', (_name, schema, extra) => {
    expect(() => schema.body.validate({ agents: ['agent-1', 'agent-2'], ...extra })).not.toThrow();
  });

  it.each(bulkSchemas)('%s bounds the length of the agents input', (_name, schema, extra) => {
    expect(() =>
      schema.body.validate({ agents: `status:${'a'.repeat(1_000_000)}`, ...extra })
    ).toThrow();
    expect(() => schema.body.validate({ agents: ['a'.repeat(513)], ...extra })).toThrow();
  });
});
