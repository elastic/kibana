/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { EntitiesNotFoundError } from '../../../errors/entities_not_found_error';
import { RESOLUTION_RULE_CONFIGS } from '../rule_registry';
import type { EffectiveResolutionRule } from '../rule_client';
import type { FetchedEntity } from '../matcher/run';
import type { AutomatedResolutionState } from '../maintainers/automated_resolution/types';
import { checkEntityRules } from './entity_check';
import type { EntityRuleCheck, EntityRuleCheckResult } from './types';

const INDEX = '.entities.v2.latest.default-00001';
const GUID = '3f2b8a10-1c4d-4f6e-9a77-5b2e1d0c9a11';

interface Scenario {
  entity: Record<string, unknown>;
  /** Group rows returned by the group query, keyed by rule id. */
  groups?: Record<string, { ids: string[]; namespaces: string[]; local?: number; total?: number }>;
  namespaceCounts?: Record<string, number>;
  fetched?: Array<[string, string]>;
  maintainerState?: AutomatedResolutionState | null;
  disabled?: string[];
}

const GROUP_COLUMNS = [
  'match_value',
  'ids',
  'unresolved_ns',
  'existing_targets',
  'unresolved_n',
  'unresolved_local_n',
  'total_n',
];

const groupRow = (group: NonNullable<Scenario['groups']>[string]): unknown[] => [
  'value',
  group.ids,
  group.namespaces,
  [],
  group.ids.length,
  group.local ?? 0,
  group.total ?? group.ids.length,
];

const response = (columns: string[], values: unknown[][]): ESQLSearchResponse =>
  ({ columns: columns.map((name) => ({ name, type: 'keyword' })), values } as ESQLSearchResponse);

const effectiveRules = (disabled: string[] = []): EffectiveResolutionRule[] =>
  RESOLUTION_RULE_CONFIGS.map((config) => ({
    id: config.id,
    kind: config.kind,
    description: config.description,
    managed: true as const,
    enabled: config.defaultEnabled && !disabled.includes(config.id),
  }));

const run = async (scenario: Scenario, entityId = 'user:test'): Promise<EntityRuleCheck> => {
  const counts = scenario.namespaceCounts ?? {
    active_directory: 10,
    okta: 10,
    local: 10,
    m365_defender: 10,
    entra_id: 10,
  };
  const runEsql = jest.fn(async (query: string): Promise<ESQLSearchResponse> => {
    if (query.startsWith('ROW v')) {
      const [, value] = /ROW v = "([^"]*)"/.exec(query) ?? [];
      const [, pattern] = /RLIKE "([^"]*)"/.exec(query) ?? [];
      return new RegExp(`^${pattern}$`).test(value)
        ? response(['v'], [[value]])
        : response(['v'], []);
    }
    if (query.includes('STATS entity_count')) {
      return response(
        ['entity_count', 'entity.namespace'],
        Object.entries(counts).map(([name, count]) => [count, name])
      );
    }
    if (query.includes('KEEP entity.id')) {
      const keys = Object.keys(scenario.entity);
      return response(keys, keys.length > 0 ? [keys.map((key) => scenario.entity[key])] : []);
    }
    // A group query: find the rule by its namespace filter (the email rule has none).
    const ruleId = RESOLUTION_RULE_CONFIGS.find(
      ({ matcher }) =>
        matcher &&
        (matcher.namespaces.length === 0
          ? !query.includes('entity.namespace IN')
          : query.includes(
              `entity.namespace IN (${matcher.namespaces.map((name) => `"${name}"`).join(', ')})`
            ))
    )?.id;
    const group = ruleId ? scenario.groups?.[ruleId] : undefined;
    return response(GROUP_COLUMNS, group ? [groupRow(group)] : []);
  });
  const fetchEntities = jest.fn(async () => {
    const map = new Map<string, FetchedEntity>();
    (scenario.fetched ?? []).forEach(([entityId2, namespace]) =>
      map.set(entityId2, { entityId: entityId2, namespace })
    );
    return map;
  });
  return checkEntityRules(entityId, {
    esClient: {} as ElasticsearchClient,
    index: INDEX,
    rules: effectiveRules(scenario.disabled),
    maintainerState: scenario.maintainerState ?? null,
    runEsql,
    fetchEntities,
  });
};

const ruleResult = (check: EntityRuleCheck, ruleId: string): EntityRuleCheckResult => {
  const found = check.rules.find(({ rule_id: id }) => id === ruleId);
  if (!found) {
    throw new Error(`No result for ${ruleId}`);
  }
  return found;
};

const userEntity = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  'entity.id': 'user:test',
  'entity.EngineMetadata.Type': 'user',
  'entity.namespace': 'active_directory',
  'entity.relationships.resolution.resolved_to': null,
  'user.email': null,
  'user.id': null,
  ...overrides,
});

describe('checkEntityRules', () => {
  it('throws when the entity does not exist', async () => {
    await expect(run({ entity: {} })).rejects.toBeInstanceOf(EntitiesNotFoundError);
  });

  it('says the email rule would link a group, choosing the Active Directory entity as target', async () => {
    const check = await run({
      entity: userEntity({ 'user.email': 'jane@corp.com' }),
      groups: {
        email_exact_match: {
          ids: ['user:jane@okta', 'user:jane@ad', 'user:jane@host4@local'],
          namespaces: ['okta', 'active_directory', 'local'],
          local: 1,
        },
      },
      fetched: [
        ['user:jane@okta', 'okta'],
        ['user:jane@ad', 'active_directory'],
        ['user:jane@host4@local', 'local'],
      ],
    });

    const email = ruleResult(check, 'email_exact_match');
    expect(email.status).toBe('would_link');
    expect(email.target_id).toBe('user:jane@ad');
    expect(email.would_link_ids).toEqual(
      expect.arrayContaining(['user:jane@okta', 'user:jane@host4@local'])
    );
    expect(check.summary).toMatchObject({ would_link: 1, healthy: true });
  });

  it('marks a rule off when it is switched off, and says so for the off-by-default rules', async () => {
    const check = await run({ entity: userEntity({}), disabled: ['email_exact_match'] });
    expect(ruleResult(check, 'email_exact_match').status).toBe('off');
    expect(ruleResult(check, 'crowdstrike_sid_bridge').status).toBe('off');
    expect(ruleResult(check, 'related_user_alias_resolution').status).toBe('off');
  });

  it('explains a lowercase SID as not applicable because the match is case sensitive', async () => {
    const check = await run({ entity: userEntity({ 'user.id': 's-1-5-21-200-1190' }) });
    const sid = ruleResult(check, 'windows_sid_bridge');
    expect(sid.status).toBe('not_applicable');
    expect(sid.reason).toContain('case sensitive');
  });

  it('explains an entity with two SIDs as not applicable', async () => {
    const check = await run({
      entity: userEntity({ 'user.id': ['S-1-5-21-300-1301', 'S-1-5-21-300-2210'] }),
    });
    const sid = ruleResult(check, 'windows_sid_bridge');
    expect(sid.status).toBe('not_applicable');
    expect(sid.reason).toContain('2 values');
  });

  it('declines a group over the size limit', async () => {
    const check = await run({
      entity: userEntity({ 'user.id': 'S-1-5-21-400-1500' }),
      groups: {
        windows_sid_bridge: { ids: ['user:svc@ad'], namespaces: ['active_directory'], total: 140 },
      },
    });
    const sid = ruleResult(check, 'windows_sid_bridge');
    expect(sid.status).toBe('declined');
    expect(sid.reason).toContain('140');
    expect(check.summary).toMatchObject({ needs_attention: 1, healthy: false });
  });

  it('declines an ambiguous Entra group where two entities share a source', async () => {
    const check = await run({
      entity: userEntity({ 'entity.namespace': 'm365_defender', 'user.id': GUID }),
      groups: {
        entra_guid_bridge: {
          ids: ['user:p1@m365', 'user:p2@m365', 'user:p@entra'],
          // The real query returns the distinct namespaces (ES|QL VALUES), not one per entity.
          namespaces: ['m365_defender', 'entra_id'],
        },
      },
    });
    const entra = ruleResult(check, 'entra_guid_bridge');
    expect(entra.status).toBe('declined');
    expect(entra.reason).toContain('Ambiguous');
  });

  it('reports no data when the store lacks the entities a rule needs', async () => {
    const check = await run({
      entity: userEntity({ 'entity.namespace': 'm365_defender', 'user.id': GUID }),
      namespaceCounts: { m365_defender: 5, okta: 3 },
    });
    const entra = ruleResult(check, 'entra_guid_bridge');
    expect(entra.status).toBe('no_data');
    expect(entra.reason).toContain('entra_id');
  });

  it('reports a failing rule with its saved failure state, ahead of any other check', async () => {
    const check = await run({
      entity: userEntity({ 'user.email': 'jane@corp.com' }),
      maintainerState: {
        version: 3,
        rules: {
          email_exact_match: {
            lastProcessedTimestamp: null,
            lastRun: null,
            consecutiveFailures: 5,
            lastError: 'circuit_breaking_exception',
            nextAttemptAt: '2026-11-16T20:00:00.000Z',
          },
        },
      },
    });
    const email = ruleResult(check, 'email_exact_match');
    expect(email.status).toBe('failing');
    expect(email.failure).toEqual({
      last_error: 'circuit_breaking_exception',
      consecutive_failures: 5,
      next_attempt_at: '2026-11-16T20:00:00.000Z',
    });
    expect(check.summary.healthy).toBe(false);
  });

  it('says nothing to link when no other entity shares the value', async () => {
    const check = await run({ entity: userEntity({ 'user.email': 'alex@corp.com' }) });
    expect(ruleResult(check, 'email_exact_match').status).toBe('nothing_to_link');
    expect(check.summary).toMatchObject({ applied: 1, healthy: true });
  });

  it('does not apply to entities that are not users', async () => {
    const check = await run({
      entity: userEntity({ 'entity.EngineMetadata.Type': 'host', 'user.email': 'a@b.c' }),
    });
    expect(ruleResult(check, 'email_exact_match').status).toBe('not_applicable');
  });
});
