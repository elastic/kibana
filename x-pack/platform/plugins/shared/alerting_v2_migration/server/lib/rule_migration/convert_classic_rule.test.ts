/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertClassicRule, isMigratedActionPolicyReady } from './convert_classic_rule';
import type { ClassicRule, MigratedActionPolicy, RuleMigrationDefinition } from './types';

const definition: RuleMigrationDefinition = {
  ruleTypeId: '.es-query',
  convertParams: () => ({
    query: { base: 'FROM logs-* | STATS c = COUNT(*) BY host.name', breach: { segment: '| WHERE c > 5' } },
    time_field: 'event.ingested',
    lookback: '5m',
    grouping: { fields: ['host.name'] },
  }),
};

const createClassicRule = (overrides: Partial<ClassicRule> = {}): ClassicRule => ({
  id: 'classic-1',
  ruleTypeId: '.es-query',
  name: 'High error count',
  tags: ['prod'],
  schedule: { interval: '1m' },
  params: {},
  ...overrides,
});

const emailAction = {
  uuid: 'action-1',
  id: 'email-connector',
  actionTypeId: '.email',
  group: 'query matched',
  params: { to: ['ops@example.com'], subject: 'Hi', message: 'Body' },
};

describe('convertClassicRule', () => {
  it('maps rule-level fields and the rule type params', () => {
    const { rule } = convertClassicRule(createClassicRule(), definition);

    expect(rule).toEqual({
      kind: 'alert',
      metadata: { name: 'High error count', tags: ['prod'] },
      time_field: 'event.ingested',
      schedule: { every: '1m', lookback: '5m' },
      recovery: { strategy: 'no_breach' },
      no_data: { strategy: 'ignore' },
      state_transition: { pending: { count: 0 }, recovering: { count: 0 } },
      query: {
        base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
        breach: { segment: '| WHERE c > 5' },
      },
      grouping: { fields: ['host.name'] },
    });
  });

  it('falls back to @timestamp and omits lookback when the rule type returns neither', () => {
    const { rule } = convertClassicRule(createClassicRule(), {
      ...definition,
      convertParams: () => ({ query: { base: 'FROM logs-*' } }),
    });

    expect(rule.time_field).toBe('@timestamp');
    expect(rule.schedule).toEqual({ every: '1m' });
  });

  it.each([
    [undefined, 0],
    [null, 0],
    [{ active: 1 }, 0],
    [{ active: 3 }, 2],
  ])('maps alert delay %j to %i pending runs', (alertDelay, count) => {
    const { rule } = convertClassicRule(createClassicRule({ alertDelay }), definition);
    expect(rule.state_transition?.pending).toEqual({ count });
  });

  it('omits tags when the classic rule has none', () => {
    const { rule } = convertClassicRule(createClassicRule({ tags: [] }), definition);
    expect(rule.metadata).toEqual({ name: 'High error count' });
  });

  it('converts the investigation guide and dashboards to artifacts', () => {
    const { rule } = convertClassicRule(
      createClassicRule({
        artifacts: {
          investigation_guide: { blob: '  Check the logs  ' },
          dashboards: [{ id: 'dash-1' }],
        },
      }),
      definition
    );

    expect(rule.artifacts).toEqual([
      { id: expect.any(String), type: 'runbook', data: { content: 'Check the logs' } },
      { id: expect.any(String), type: 'dashboard', data: { dashboard_id: 'dash-1' } },
    ]);
  });

  it('omits artifacts when the classic rule has none to convert', () => {
    const { rule } = convertClassicRule(
      createClassicRule({ artifacts: { investigation_guide: { blob: ' ' }, dashboards: [] } }),
      definition
    );
    expect(rule).not.toHaveProperty('artifacts');
  });

  it('adds a routing tag linking the rule to its converted action policies', () => {
    const { rule, actionPolicies } = convertClassicRule(
      createClassicRule({ actions: [emailAction] }),
      definition
    );

    expect(rule.metadata.routing_tags).toEqual(['migrated-rule:classic-1']);
    expect(actionPolicies).toHaveLength(1);
    expect(actionPolicies[0].policy.matcher).toEqual({ tags: ['migrated-rule:classic-1'] });
  });

  it('adds no routing tag when no action converts', () => {
    const { rule, skippedActions } = convertClassicRule(
      createClassicRule({
        actions: [{ ...emailAction, id: 'webhook', actionTypeId: '.webhook' }],
      }),
      definition
    );

    expect(rule.metadata).not.toHaveProperty('routing_tags');
    expect(skippedActions).toEqual([
      {
        sourceActionId: 'action-1',
        sourceConnectorTypeId: '.webhook',
        reason: 'unsupported_connector',
      },
    ]);
  });
});

describe('isMigratedActionPolicyReady', () => {
  const policy: MigratedActionPolicy = {
    sourceActionId: 'a',
    sourceConnectorId: 'c',
    sourceConnectorTypeId: '.email',
    stepType: 'email',
    connectorId: 'c',
    params: '',
    policy: { name: 'p', matcher: { tags: ['t'] } },
    notes: [],
  };

  it('is ready when a connector is set', () => {
    expect(isMigratedActionPolicyReady(policy)).toBe(true);
  });

  it('is not ready without a connector', () => {
    expect(isMigratedActionPolicyReady({ ...policy, connectorId: null })).toBe(false);
  });

  it('is not ready when a connector must be picked', () => {
    expect(isMigratedActionPolicyReady({ ...policy, notes: ['connector_required'] })).toBe(false);
  });
});
