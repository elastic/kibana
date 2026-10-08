/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ResolutionClient } from '../../resolution_client';
import { ResolutionSearchTruncatedError } from '../../../errors';
import { RESOLUTION_RULE_IDS } from '../../../../../common/domain/resolution_rules/constants';
import { USER_ENTITY_NAMESPACE } from '../../../../../common/domain/definitions/user_entity_constants';
import { getResolutionRuleConfig } from '../rule_registry';
import { GROUP_SIZE_CEILING, MATCH_GROUP_COLUMNS } from './constants';
import { runEsqlMatcherRule } from './run';
import type { RunEsqlMatcherDeps } from './run';
import type { PerRuleState } from '../maintainers/automated_resolution/types';

jest.mock('../../../asset_manager/resolve_entity_store_indices', () => ({
  resolveLatestEntitiesIndexName: jest.fn().mockResolvedValue('.entities.v2.latest.default'),
}));

const EMAIL_SPEC = getResolutionRuleConfig(RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH)!.matcher!;
const SID_SPEC = getResolutionRuleConfig(RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE)!.matcher!;
const CROWDSTRIKE_SID_SPEC = getResolutionRuleConfig(RESOLUTION_RULE_IDS.CROWDSTRIKE_SID_BRIDGE)!
  .matcher!;

const WATERMARK = '2026-08-10T00:00:00Z';

const createInitialState = (overrides: Partial<PerRuleState> = {}): PerRuleState => ({
  lastProcessedTimestamp: null,
  lastRun: null,
  ...overrides,
});

const createDeps = (
  state: PerRuleState,
  esClient: ElasticsearchClient,
  resolutionClient: ResolutionClient,
  overrides: Partial<RunEsqlMatcherDeps> = {}
): RunEsqlMatcherDeps => ({
  state,
  namespace: 'default',
  esClient,
  logger: loggerMock.create(),
  resolutionClient,
  signal: new AbortController().signal,
  telemetry: { report: jest.fn() },
  spec: EMAIL_SPEC,
  ruleId: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
  pageSize: 5,
  ...overrides,
});

const esqlResponse = (columns: string[], values: unknown[][]): ESQLSearchResponse =>
  ({
    columns: columns.map((name) => ({ name, type: 'keyword' })),
    values,
  } as ESQLSearchResponse);

const GROUP_COLUMNS: string[] = Object.values(MATCH_GROUP_COLUMNS);

const emptyGroups = () => esqlResponse(GROUP_COLUMNS, []);

const watermarkResponse = (maxTs: string | null) => esqlResponse(['max_ts'], [[maxTs]]);

type Member = readonly [id: string, namespace: string];
type StoredEntity = readonly [id: string, namespace: string, resolvedTo?: string];

interface MatchGroup {
  row: unknown[];
  entities: StoredEntity[];
}

/**
 * One match-group row plus the entity documents behind it. Every column the
 * query aggregates is derived from `members`, the group's unresolved entities.
 */
const matchGroup = ({
  matchValue,
  members,
  existingTargets = [],
  groupSize,
}: {
  matchValue: string;
  members: Member[];
  existingTargets?: StoredEntity[];
  groupSize?: number;
}): MatchGroup => {
  const ids = members.map(([id]) => id);
  const targetIds = existingTargets.map(([id]) => id);
  const columns: Record<string, unknown> = {
    [MATCH_GROUP_COLUMNS.matchValue]: matchValue,
    [MATCH_GROUP_COLUMNS.ids]: ids,
    [MATCH_GROUP_COLUMNS.unresolvedNs]: [...new Set(members.map(([, namespace]) => namespace))],
    [MATCH_GROUP_COLUMNS.existingTargets]: targetIds,
    [MATCH_GROUP_COLUMNS.unresolvedN]: members.length,
    [MATCH_GROUP_COLUMNS.unresolvedLocalN]: members.filter(
      ([, namespace]) => namespace === USER_ENTITY_NAMESPACE.Local
    ).length,
    [MATCH_GROUP_COLUMNS.totalN]: groupSize ?? ids.length + targetIds.length,
  };
  return {
    row: GROUP_COLUMNS.map((column) => columns[column]),
    entities: [...members, ...existingTargets],
  };
};

const entityHit = (id: string, namespace: string, resolvedTo?: string) => ({
  _id: `doc-${id}`,
  _source: {
    entity: {
      id,
      namespace,
      ...(resolvedTo ? { relationships: { resolution: { resolved_to: resolvedTo } } } : {}),
    },
  },
});

describe('runEsqlMatcherRule', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockCascadeLink: jest.Mock;
  let mockResolutionClient: ResolutionClient;

  /** Mocks the watermark query, one ES|QL response per page, and the entity fetch. */
  const mockGroupPages = (...pages: MatchGroup[][]) => {
    const esqlQuery = mockEsClient.esql.query as jest.Mock;
    esqlQuery.mockResolvedValueOnce(watermarkResponse(WATERMARK));
    for (const page of pages) {
      esqlQuery.mockResolvedValueOnce(
        esqlResponse(
          GROUP_COLUMNS,
          page.map((group) => group.row)
        )
      );
    }

    const entities = new Map(
      pages.flat().flatMap((group) => group.entities.map((entity) => [entity[0], entity] as const))
    );
    (mockEsClient.search as jest.Mock).mockImplementation(async ({ query }) => {
      const ids: string[] = query.bool.filter[0].terms['entity.id'];
      return {
        hits: {
          hits: ids.flatMap((id) => {
            const entity = entities.get(id);
            return entity ? [entityHit(...entity)] : [];
          }),
        },
      };
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCascadeLink = jest.fn().mockResolvedValue({
      linked: ['alias-1'],
      retargeted: [],
      skipped: [],
      cascadesBlocked: 0,
      target_id: 'target-1',
    });
    mockResolutionClient = {
      cascadeLinkEntities: mockCascadeLink,
    } as unknown as ResolutionClient;
    mockEsClient = {
      esql: { query: jest.fn() },
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  it('skips grouping and keeps the watermark when nothing is newer', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse(null))
      .mockResolvedValueOnce(emptyGroups());

    const result = await runEsqlMatcherRule(createDeps(state, mockEsClient, mockResolutionClient));

    expect(result.lastProcessedTimestamp).toBe('2026-08-01T00:00:00Z');
    expect(result.lastRun).toEqual({
      resolutionsCreated: 0,
      skippedAmbiguousBuckets: 0,
      skippedOversizedBuckets: 0,
      skippedNoopBuckets: 0,
      cascadeRetargeted: 0,
      cascadesBlocked: 0,
    });
    expect(mockCascadeLink).not.toHaveBeenCalled();
  });

  it('omits the first_seen bound from the grouping query when watermark is null', async () => {
    mockGroupPages([]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    const groupingQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[1][0].query as string;
    expect(groupingQuery).not.toContain('first_seen > TO_DATETIME');
  });

  it('pages until a short page and links every group', async () => {
    const oktaEntraPair = (letter: string) =>
      matchGroup({
        matchValue: `${letter}@corp.com`,
        members: [
          [`user-${letter}1`, 'okta'],
          [`user-${letter}2`, 'entra_id'],
        ],
      });
    mockGroupPages(['a', 'b', 'c', 'd', 'e'].map(oktaEntraPair), ['f', 'g'].map(oktaEntraPair));

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { pageSize: 5 })
    );

    const groupingQueries = (mockEsClient.esql.query as jest.Mock).mock.calls
      .slice(1)
      .map((call) => call[0].query as string);
    expect(groupingQueries).toHaveLength(2);
    expect(groupingQueries[0]).toContain('| LIMIT 5');
    expect(groupingQueries[0]).not.toContain('match_value >');
    expect(groupingQueries[1]).toContain('| WHERE match_value > "e@corp.com"');
    expect(mockCascadeLink).toHaveBeenCalledTimes(7);
    expect(result.lastProcessedTimestamp).toBe(WATERMARK);
    expect(result.lastRun?.resolutionsCreated).toBe(7);
  });

  it('declines a bucket with two unresolved entities in one namespace', async () => {
    const logger = loggerMock.create();
    mockGroupPages([
      matchGroup({
        matchValue: 'shared@corp.com',
        members: [
          ['user-1', 'microsoft_365'],
          ['user-2', 'microsoft_365'],
        ],
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { logger })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedAmbiguousBuckets).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ambiguous bucket'));
  });

  it('links two local entities, an AD user and an Okta user sharing an email onto the AD user', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'john.smith@corp.com',
        members: [
          ['user-local-a', 'local'],
          ['user-local-b', 'local'],
          ['user-ad', 'active_directory'],
          ['user-okta', 'okta'],
        ],
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient)
    );

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', [
      'user-local-a',
      'user-local-b',
      'user-okta',
    ]);
    expect(result.lastRun?.skippedAmbiguousBuckets).toBe(0);
  });

  it('links local entities with different user names sharing an email', async () => {
    const jsmith = 'user:jsmith@host-a@local';
    const jsmithAdmin = 'user:jsmith_adm@host-a@local';
    mockGroupPages([
      matchGroup({
        matchValue: 'jsmith@corp.com',
        members: [
          [jsmith, 'local'],
          [jsmithAdmin, 'local'],
        ],
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledTimes(1);
    const [targetId, aliasIds] = mockCascadeLink.mock.calls[0];
    expect([targetId, ...aliasIds].sort()).toEqual([jsmith, jsmithAdmin].sort());
  });

  it('declines two AD entities and one Okta entity sharing an email', async () => {
    const logger = loggerMock.create();
    mockGroupPages([
      matchGroup({
        matchValue: 'shared@corp.com',
        members: [
          ['user-ad-1', 'active_directory'],
          ['user-ad-2', 'active_directory'],
          ['user-okta', 'okta'],
        ],
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { logger })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedAmbiguousBuckets).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('3 unresolved entities across 2 namespaces (0 local not counted)')
    );
  });

  it('declines two AD entities sharing an email even when local entities share it too', async () => {
    const logger = loggerMock.create();
    mockGroupPages([
      matchGroup({
        matchValue: 'shared@corp.com',
        members: [
          ['user-ad-1', 'active_directory'],
          ['user-ad-2', 'active_directory'],
          ['user-local-a', 'local'],
          ['user-local-b', 'local'],
        ],
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { logger })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedAmbiguousBuckets).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('2 unresolved entities across 1 namespaces (2 local not counted)')
    );
  });

  it('links several local entities sharing an email when no IdP user has it', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'jane@corp.com',
        members: [
          ['user-local-z', 'local'],
          ['user-local-a', 'local'],
          ['user-local-m', 'local'],
        ],
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient)
    );

    expect(mockCascadeLink).toHaveBeenCalledWith('user-local-a', ['user-local-z', 'user-local-m']);
    expect(result.lastRun?.skippedAmbiguousBuckets).toBe(0);
  });

  it('links a new local host into an email group already headed by a local entity', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'jane@corp.com',
        members: [
          ['user-local-a', 'local'],
          ['user-local-c', 'local'],
        ],
        existingTargets: [['user-local-a', 'local']],
        groupSize: 3,
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-local-a', ['user-local-c']);
  });

  it('picks the AD user as target over an existing local head', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'jane@corp.com',
        members: [
          ['user-ad', 'active_directory'],
          ['user-local-a', 'local'],
        ],
        existingTargets: [['user-local-a', 'local']],
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-local-a']);
  });

  it('links several unresolved local entities sharing a SID onto the AD target', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'S-1-5-21-111-222-333-1104',
        members: [
          ['user-local-a', 'local'],
          ['user-local-b', 'local'],
          ['user-ad', 'active_directory'],
        ],
      }),
    ]);

    await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, {
        spec: SID_SPEC,
        ruleId: RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE,
      })
    );

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-local-a', 'user-local-b']);
  });

  it('links two AD entities sharing a SID because a SID names one account, not a collision', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'S-1-5-21-111-222-333-1104',
        members: [
          ['user-ad-1', 'active_directory'],
          ['user-ad-2', 'active_directory'],
          ['user-local', 'local'],
        ],
      }),
    ]);

    await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, {
        spec: SID_SPEC,
        ruleId: RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE,
      })
    );

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad-1', ['user-ad-2', 'user-local']);
  });

  it('links two leftover CrowdStrike-namespace entities sharing a SID because a SID names one account, not a collision', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'S-1-5-21-111-222-333-1104',
        members: [
          ['user-cs-1', 'crowdstrike'],
          ['user-cs-2', 'crowdstrike'],
        ],
      }),
    ]);

    await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, {
        spec: CROWDSTRIKE_SID_SPEC,
        ruleId: RESOLUTION_RULE_IDS.CROWDSTRIKE_SID_BRIDGE,
      })
    );

    expect(mockCascadeLink).toHaveBeenCalledWith('user-cs-1', ['user-cs-2']);
  });

  it('links two unresolved local entities sharing a domain SID with no other namespace', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'S-1-5-21-111-222-333-1104',
        members: [
          ['user-local-z', 'local'],
          ['user-local-a', 'local'],
        ],
      }),
    ]);

    await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, {
        spec: SID_SPEC,
        ruleId: RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE,
      })
    );

    expect(mockCascadeLink).toHaveBeenCalledWith('user-local-a', ['user-local-z']);
  });

  it('retargets a local-headed SID group onto Active Directory when the AD user arrives', async () => {
    mockCascadeLink.mockResolvedValueOnce({
      linked: ['user-local-a'],
      retargeted: ['user-local-z'],
      skipped: [],
      cascadesBlocked: 0,
      target_id: 'user-ad',
    });
    mockGroupPages([
      matchGroup({
        matchValue: 'S-1-5-21-111-222-333-1104',
        members: [
          ['user-ad', 'active_directory'],
          ['user-local-a', 'local'],
        ],
        existingTargets: [['user-local-a', 'local']],
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, {
        spec: SID_SPEC,
        ruleId: RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE,
      })
    );

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-local-a']);
    expect(result.lastRun?.resolutionsCreated).toBe(1);
    expect(result.lastRun?.cascadeRetargeted).toBe(1);
  });

  it('declines a bucket above the group-size ceiling without linking a subset', async () => {
    const logger = loggerMock.create();
    mockGroupPages([
      matchGroup({
        matchValue: 'shared@corp.com',
        members: [
          ['user-1', 'okta'],
          ['user-2', 'entra_id'],
        ],
        groupSize: GROUP_SIZE_CEILING + 1,
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { logger })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedOversizedBuckets).toBe(1);
    expect(result.lastRun).not.toHaveProperty('oversizedLargestGroup');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('oversized bucket'));
  });

  it('bins declined oversized group sizes and reports the largest in telemetry', async () => {
    const telemetry = { report: jest.fn() };
    mockGroupPages([
      matchGroup({
        matchValue: 'helpdesk@corp.com',
        members: [
          ['user-1', 'okta'],
          ['user-2', 'entra_id'],
        ],
        groupSize: 150,
      }),
      matchGroup({
        matchValue: 'scanner@corp.com',
        members: [
          ['user-a', 'okta'],
          ['user-b', 'entra_id'],
        ],
        groupSize: 12_000,
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, {
        telemetry,
        pageSize: 10,
      })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedOversizedBuckets).toBe(2);
    expect(result.lastRun).not.toHaveProperty('oversizedLargestGroup');
    expect(telemetry.report).toHaveBeenCalledWith(
      expect.objectContaining({
        breakdown: expect.arrayContaining([
          { name: 'oversized_skips', count: 2 },
          { name: 'oversized_101_1000', count: 1 },
          { name: 'oversized_1001_10000', count: 0 },
          { name: 'oversized_over_10000', count: 1 },
          { name: 'oversized_largest_group', count: 12_000 },
        ]),
      })
    );
  });

  it('cascade-links unresolved members onto the namespace-priority target', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
          ['user-ad', 'active_directory'],
        ],
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-okta', 'user-entra']);
  });

  it('extends an existing group by cascade-linking onto the known target', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [['user-new', 'entra_id']],
        existingTargets: [['user-okta', 'okta']],
        groupSize: 3,
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-okta', ['user-new']);
  });

  it('does not rewrite an already-correct group when the email watermark is reset', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [],
        existingTargets: [['user-okta', 'okta']],
        groupSize: 2,
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient)
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.resolutionsCreated).toBe(0);
    expect(result.lastRun?.skippedNoopBuckets).toBe(1);
  });

  it('counts a singleton unresolved group with no existing targets as a no-op skip', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'solo@corp.com',
        members: [['user-solo', 'okta']],
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient)
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(mockEsClient.search).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedNoopBuckets).toBe(1);
  });

  it('counts a missing-entity fetch as a no-op skip and warns', async () => {
    const logger = loggerMock.create();
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
        ],
      }),
    ]);
    (mockEsClient.search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { logger })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedNoopBuckets).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Elasticsearch returned none')
    );
  });

  it('retargets an out-of-group existing target when a higher-priority unresolved member wins', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [['user-ad', 'active_directory']],
        existingTargets: [['user-okta', 'okta']],
        groupSize: 2,
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-okta']);
  });

  it('includes a losing existing target when linking other unresolved members', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [
          ['user-ad', 'active_directory'],
          ['user-slack', 'slack'],
        ],
        existingTargets: [['user-okta', 'okta']],
        groupSize: 4,
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-slack', 'user-okta']);
  });

  it('does not pass a mid-chain existing target to cascadeLinkEntities', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [['user-cs', 'crowdstrike']],
        existingTargets: [
          ['user-mid', 'active_directory', 'user-okta'],
          ['user-okta', 'okta'],
        ],
        groupSize: 3,
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-okta', ['user-cs']);
  });

  it('does not advance the watermark when a bucket fails', async () => {
    const logger = loggerMock.create();
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
        ],
      }),
    ]);
    mockCascadeLink.mockRejectedValueOnce(new Error('transient ES failure'));

    const result = await runEsqlMatcherRule(
      createDeps(state, mockEsClient, mockResolutionClient, { logger })
    );

    expect(result.lastProcessedTimestamp).toBe('2026-08-01T00:00:00Z');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to resolve bucket'));
  });

  it('skips a truncated alias tree and advances the watermark', async () => {
    const logger = loggerMock.create();
    const telemetry = { report: jest.fn() };
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
        ],
      }),
    ]);
    mockCascadeLink.mockRejectedValueOnce(
      new ResolutionSearchTruncatedError('validateAndGetRetargetableAliases', 10000, 12000)
    );

    const result = await runEsqlMatcherRule(
      createDeps(state, mockEsClient, mockResolutionClient, { logger, telemetry })
    );

    expect(result.lastProcessedTimestamp).toBe(WATERMARK);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('truncated alias tree'));
    expect(telemetry.report).toHaveBeenCalledWith(
      expect.objectContaining({
        funnel: {
          scanned: 1,
          qualified: 1,
          applied: 0,
          skipped: 1,
          failed: 0,
        },
        breakdown: expect.arrayContaining([{ name: 'truncated_skips', count: 1 }]),
      })
    );
  });

  it('reports per-rule telemetry distinguishing link, cascade, and skip outcomes', async () => {
    const telemetry = { report: jest.fn() };
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
        ],
      }),
    ]);
    mockCascadeLink.mockResolvedValueOnce({
      linked: ['user-entra'],
      retargeted: ['user-old'],
      skipped: [],
      cascadesBlocked: 0,
      target_id: 'user-okta',
    });

    await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { telemetry })
    );

    expect(telemetry.report).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: { kind: 'rule', value: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH },
        breakdown: expect.arrayContaining([
          { name: 'examined', count: 1 },
          { name: 'links_created', count: 1 },
          { name: 'cascade_retargeted', count: 1 },
          { name: 'cascades_blocked', count: 0 },
          { name: 'ambiguous_skips', count: 0 },
          { name: 'oversized_skips', count: 0 },
          { name: 'oversized_101_1000', count: 0 },
          { name: 'oversized_1001_10000', count: 0 },
          { name: 'oversized_over_10000', count: 0 },
          { name: 'oversized_largest_group', count: 0 },
          { name: 'noop_skips', count: 0 },
          { name: 'blocked_skips', count: 0 },
          { name: 'stale_overlap_skips', count: 0 },
          { name: 'truncated_skips', count: 0 },
        ]),
      })
    );
  });

  it('returns state unchanged when aborted before grouping', async () => {
    const abortCtrl = new AbortController();
    abortCtrl.abort();
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    (mockEsClient.esql.query as jest.Mock).mockResolvedValueOnce(watermarkResponse(WATERMARK));

    const result = await runEsqlMatcherRule(
      createDeps(state, mockEsClient, mockResolutionClient, { signal: abortCtrl.signal })
    );

    expect(result.lastProcessedTimestamp).toBe('2026-08-01T00:00:00Z');
    expect(result.lastRun).toBeNull();
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('forwards the abort signal on the watermark query', async () => {
    const abortCtrl = new AbortController();
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse(null))
      .mockResolvedValueOnce(emptyGroups());

    await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, {
        signal: abortCtrl.signal,
      })
    );

    const watermarkCall = (mockEsClient.esql.query as jest.Mock).mock.calls[0];
    expect(watermarkCall[1]).toEqual(expect.objectContaining({ signal: abortCtrl.signal }));
  });

  it('does not advance the watermark when ES|QL returns partial results', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    (mockEsClient.esql.query as jest.Mock).mockResolvedValueOnce({
      ...watermarkResponse(WATERMARK),
      is_partial: true,
    });

    await expect(
      runEsqlMatcherRule(createDeps(state, mockEsClient, mockResolutionClient))
    ).rejects.toThrow(/partial results/);
  });

  it('throws when a required match-group column is missing', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse(WATERMARK))
      .mockResolvedValueOnce(esqlResponse(['match_value', 'ids'], [['a@corp.com', ['user-1']]]));

    await expect(
      runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient))
    ).rejects.toThrow(/missing column 'unresolved_ns'/);
  });

  it('links a group whose size equals the ceiling', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
        ],
        groupSize: GROUP_SIZE_CEILING,
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledTimes(1);
  });

  it('cascade-links both existing targets when a higher-priority unresolved member wins', async () => {
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [['user-ad', 'active_directory']],
        existingTargets: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
        ],
        groupSize: 3,
      }),
    ]);

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-okta', 'user-entra']);
  });

  it('skips a group that overlaps ids written earlier this tick and holds the watermark', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    const mutatedIds = new Set(['user-okta']);
    mockGroupPages([
      matchGroup({
        matchValue: 'alice@corp.com',
        members: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
        ],
      }),
    ]);

    const result = await runEsqlMatcherRule(
      createDeps(state, mockEsClient, mockResolutionClient, { mutatedIds })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastProcessedTimestamp).toBe('2026-08-01T00:00:00Z');
  });

  it('reports a mixed funnel where scanned equals applied plus skipped plus failed', async () => {
    const telemetry = { report: jest.fn() };
    mockGroupPages([
      matchGroup({
        matchValue: 'applied@corp.com',
        members: [
          ['user-okta', 'okta'],
          ['user-entra', 'entra_id'],
        ],
      }),
      matchGroup({
        matchValue: 'ambiguous@corp.com',
        members: [
          ['user-1', 'microsoft_365'],
          ['user-2', 'microsoft_365'],
        ],
      }),
      matchGroup({
        matchValue: 'oversized@corp.com',
        members: [
          ['user-a', 'okta'],
          ['user-b', 'entra_id'],
        ],
        groupSize: GROUP_SIZE_CEILING + 1,
      }),
      matchGroup({
        matchValue: 'noop@corp.com',
        members: [],
        existingTargets: [['user-okta-noop', 'okta']],
        groupSize: 2,
      }),
      matchGroup({
        matchValue: 'blocked@corp.com',
        members: [
          ['user-blocked-a', 'okta'],
          ['user-blocked-b', 'entra_id'],
        ],
      }),
      matchGroup({
        matchValue: 'failed@corp.com',
        members: [
          ['user-fail-a', 'okta'],
          ['user-fail-b', 'entra_id'],
        ],
      }),
    ]);
    mockCascadeLink
      .mockResolvedValueOnce({
        linked: ['user-entra'],
        retargeted: [],
        skipped: [],
        cascadesBlocked: 0,
        target_id: 'user-okta',
      })
      .mockResolvedValueOnce({
        linked: [],
        retargeted: [],
        skipped: [],
        cascadesBlocked: 2,
        target_id: 'user-blocked-a',
      })
      .mockRejectedValueOnce(new Error('transient ES failure'));

    await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, {
        telemetry,
        pageSize: 10,
      })
    );

    const funnel = telemetry.report.mock.calls[0][0].funnel;
    expect(funnel).toEqual({
      scanned: 6,
      qualified: 5,
      applied: 1,
      skipped: 4,
      failed: 1,
    });
    expect(funnel.scanned).toBe(funnel.applied + funnel.skipped + funnel.failed);
    expect(telemetry.report).toHaveBeenCalledWith(
      expect.objectContaining({
        breakdown: expect.arrayContaining([
          { name: 'examined', count: 6 },
          { name: 'ambiguous_skips', count: 1 },
          { name: 'oversized_skips', count: 1 },
          { name: 'noop_skips', count: 1 },
          { name: 'blocked_skips', count: 1 },
        ]),
      })
    );
  });
});
