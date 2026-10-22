/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BulkChangeAgentsPrivilegeLevelRequestSchema,
  BulkMigrateAgentsRequestSchema,
  GetAgentsRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostBulkAgentRestartRequestSchema,
  PostBulkAgentRollbackRequestSchema,
  PostBulkAgentUnenrollRequestSchema,
  PostBulkAgentUpgradeRequestSchema,
  PostBulkRemoveCollectorsRequestSchema,
  PostBulkRequestDiagnosticsActionRequestSchema,
  PostBulkUpdateAgentTagsRequestSchema,
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

describe('bulk action request schemas validate the `agents` KQL string', () => {
  const bulkSchemas: Array<
    [string, { body: { validate: (value: unknown) => void } }, Record<string, unknown>]
  > = [
    ['PostBulkAgentUnenrollRequestSchema', PostBulkAgentUnenrollRequestSchema, {}],
    ['PostBulkRemoveCollectorsRequestSchema', PostBulkRemoveCollectorsRequestSchema, {}],
    ['PostBulkAgentUpgradeRequestSchema', PostBulkAgentUpgradeRequestSchema, { version: '9.5.1' }],
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
    ['PostBulkAgentRestartRequestSchema', PostBulkAgentRestartRequestSchema, {}],
  ];

  it.each(bulkSchemas)('%s rejects fields outside the agent mappings', (_name, schema, extra) => {
    expect(() => schema.body.validate({ agents: 'default_api_key:d*', ...extra })).toThrow(
      /not allowed/
    );
    expect(() => schema.body.validate({ agents: 'access_api_key:d*', ...extra })).toThrow(
      /not allowed/
    );
  });

  it.each(bulkSchemas)('%s still allows a valid KQL string', (_name, schema, extra) => {
    expect(() => schema.body.validate({ agents: 'status:online', ...extra })).not.toThrow();
  });

  it.each(bulkSchemas)('%s still allows an array of agent ids', (_name, schema, extra) => {
    expect(() => schema.body.validate({ agents: ['agent-1', 'agent-2'], ...extra })).not.toThrow();
  });

  it('rejects fields outside the agent mappings when dryRun is set', () => {
    expect(() =>
      PostBulkRequestDiagnosticsActionRequestSchema.body.validate({
        agents: 'default_api_key:d*',
        dryRun: true,
      })
    ).toThrow(/not allowed/);
  });
});
