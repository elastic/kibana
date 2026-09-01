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
import { RESOLUTION_RULE_IDS } from '../../../../../common/domain/resolution_rules/constants';
import { getResolutionRuleConfig } from '../rule_registry';
import { GROUP_SIZE_CEILING } from './constants';
import { runEsqlMatcherRule } from './run';
import type { RunEsqlMatcherDeps } from './run';
import type { PerRuleState } from '../maintainers/automated_resolution/types';

jest.mock('../../../asset_manager/resolve_entity_store_indices', () => ({
  resolveLatestEntitiesIndexName: jest.fn().mockResolvedValue('.entities.v2.latest.default'),
}));

const EMAIL_SPEC = getResolutionRuleConfig(RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH)!.matcher!;

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

const emptyGroups = () =>
  esqlResponse(
    ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
    []
  );

const watermarkResponse = (maxTs: string | null) => esqlResponse(['max_ts'], [[maxTs]]);

const groupRow = ({
  matchValue,
  unresolvedIds,
  namespaces,
  existingTargets = [],
  unresolvedCount,
  groupSize,
}: {
  matchValue: string;
  unresolvedIds: string[];
  namespaces: string[];
  existingTargets?: string[];
  unresolvedCount?: number;
  groupSize?: number;
}) => [
  matchValue,
  unresolvedIds,
  namespaces,
  existingTargets,
  unresolvedCount ?? unresolvedIds.length,
  groupSize ?? unresolvedIds.length + existingTargets.length,
];

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
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(emptyGroups());

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    const groupingQuery = (mockEsClient.esql.query as jest.Mock).mock.calls[1][0].query as string;
    expect(groupingQuery).not.toContain('first_seen > TO_DATETIME');
  });

  it('pages until a short page and links every group', async () => {
    const page1 = esqlResponse(
      ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
      [
        groupRow({
          matchValue: 'a@corp.com',
          unresolvedIds: ['user-a1', 'user-a2'],
          namespaces: ['okta', 'entra_id'],
        }),
        groupRow({
          matchValue: 'b@corp.com',
          unresolvedIds: ['user-b1', 'user-b2'],
          namespaces: ['okta', 'entra_id'],
        }),
        groupRow({
          matchValue: 'c@corp.com',
          unresolvedIds: ['user-c1', 'user-c2'],
          namespaces: ['okta', 'entra_id'],
        }),
        groupRow({
          matchValue: 'd@corp.com',
          unresolvedIds: ['user-d1', 'user-d2'],
          namespaces: ['okta', 'entra_id'],
        }),
        groupRow({
          matchValue: 'e@corp.com',
          unresolvedIds: ['user-e1', 'user-e2'],
          namespaces: ['okta', 'entra_id'],
        }),
      ]
    );
    const page2 = esqlResponse(
      ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
      [
        groupRow({
          matchValue: 'f@corp.com',
          unresolvedIds: ['user-f1', 'user-f2'],
          namespaces: ['okta', 'entra_id'],
        }),
        groupRow({
          matchValue: 'g@corp.com',
          unresolvedIds: ['user-g1', 'user-g2'],
          namespaces: ['okta', 'entra_id'],
        }),
      ]
    );

    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    (mockEsClient.search as jest.Mock).mockImplementation(async ({ query }) => {
      const ids: string[] = query.bool.filter[0].terms['entity.id'];
      return {
        hits: { hits: ids.map((id) => entityHit(id, id.endsWith('1') ? 'okta' : 'entra_id')) },
      };
    });

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
    expect(result.lastProcessedTimestamp).toBe('2026-08-10T00:00:00Z');
    expect(result.lastRun?.resolutionsCreated).toBe(7);
  });

  it('declines a bucket with two unresolved entities in one namespace', async () => {
    const logger = loggerMock.create();
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'shared@corp.com',
              unresolvedIds: ['user-1', 'user-2'],
              namespaces: ['microsoft_365'],
              unresolvedCount: 2,
              groupSize: 2,
            }),
          ]
        )
      );

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { logger })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedAmbiguousBuckets).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ambiguous bucket'));
  });

  it('declines a bucket above the group-size ceiling without linking a subset', async () => {
    const logger = loggerMock.create();
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'shared@corp.com',
              unresolvedIds: ['user-1', 'user-2'],
              namespaces: ['okta', 'entra_id'],
              unresolvedCount: 2,
              groupSize: GROUP_SIZE_CEILING + 1,
            }),
          ]
        )
      );

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient, { logger })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.skippedOversizedBuckets).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('oversized bucket'));
  });

  it('cascade-links unresolved members onto the namespace-priority target', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-okta', 'user-entra', 'user-ad'],
              namespaces: ['okta', 'entra_id', 'active_directory'],
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          entityHit('user-okta', 'okta'),
          entityHit('user-entra', 'entra_id'),
          entityHit('user-ad', 'active_directory'),
        ],
      },
    });

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-okta', 'user-entra']);
  });

  it('extends an existing group by cascade-linking onto the known target', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-new'],
              namespaces: ['entra_id'],
              existingTargets: ['user-okta'],
              unresolvedCount: 1,
              groupSize: 3,
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [entityHit('user-new', 'entra_id'), entityHit('user-okta', 'okta')],
      },
    });

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-okta', ['user-new']);
  });

  it('does not rewrite an already-correct group when the email watermark is reset', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: [],
              namespaces: [],
              existingTargets: ['user-okta'],
              unresolvedCount: 0,
              groupSize: 2,
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [entityHit('user-okta', 'okta')],
      },
    });

    const result = await runEsqlMatcherRule(
      createDeps(createInitialState(), mockEsClient, mockResolutionClient)
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastRun?.resolutionsCreated).toBe(0);
    expect(result.lastRun?.skippedNoopBuckets).toBe(1);
  });

  it('retargets an out-of-group existing target when a higher-priority unresolved member wins', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-ad'],
              namespaces: ['active_directory'],
              existingTargets: ['user-okta'],
              unresolvedCount: 1,
              groupSize: 2,
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [entityHit('user-ad', 'active_directory'), entityHit('user-okta', 'okta')],
      },
    });

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-okta']);
  });

  it('includes a losing existing target when linking other unresolved members', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-ad', 'user-slack'],
              namespaces: ['active_directory', 'slack'],
              existingTargets: ['user-okta'],
              unresolvedCount: 2,
              groupSize: 4,
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          entityHit('user-ad', 'active_directory'),
          entityHit('user-slack', 'slack'),
          entityHit('user-okta', 'okta'),
        ],
      },
    });

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-slack', 'user-okta']);
  });

  it('does not pass a mid-chain existing target to cascadeLinkEntities', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-ad'],
              namespaces: ['active_directory'],
              existingTargets: ['user-mid', 'user-okta'],
              unresolvedCount: 1,
              groupSize: 3,
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          entityHit('user-ad', 'active_directory'),
          entityHit('user-mid', 'entra_id', 'user-okta'),
          entityHit('user-okta', 'okta'),
        ],
      },
    });

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-okta']);
  });

  it('does not advance the watermark when a bucket fails', async () => {
    const logger = loggerMock.create();
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-okta', 'user-entra'],
              namespaces: ['okta', 'entra_id'],
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [entityHit('user-okta', 'okta'), entityHit('user-entra', 'entra_id')],
      },
    });
    mockCascadeLink.mockRejectedValueOnce(new Error('transient ES failure'));

    const result = await runEsqlMatcherRule(
      createDeps(state, mockEsClient, mockResolutionClient, { logger })
    );

    expect(result.lastProcessedTimestamp).toBe('2026-08-01T00:00:00Z');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to resolve bucket'));
  });

  it('reports per-rule telemetry distinguishing link, cascade, and skip outcomes', async () => {
    const telemetry = { report: jest.fn() };
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-okta', 'user-entra'],
              namespaces: ['okta', 'entra_id'],
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [entityHit('user-okta', 'okta'), entityHit('user-entra', 'entra_id')],
      },
    });
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
          { name: 'noop_skips', count: 0 },
          { name: 'blocked_skips', count: 0 },
          { name: 'stale_overlap_skips', count: 0 },
        ]),
      })
    );
  });

  it('returns state unchanged when aborted before grouping', async () => {
    const abortCtrl = new AbortController();
    abortCtrl.abort();
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    (mockEsClient.esql.query as jest.Mock).mockResolvedValueOnce(
      watermarkResponse('2026-08-10T00:00:00Z')
    );

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
      ...watermarkResponse('2026-08-10T00:00:00Z'),
      is_partial: true,
    });

    await expect(
      runEsqlMatcherRule(createDeps(state, mockEsClient, mockResolutionClient))
    ).rejects.toThrow(/partial results/);
  });

  it('throws when a required match-group column is missing', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(esqlResponse(['match_value', 'ids'], [['a@corp.com', ['user-1']]]));

    await expect(
      runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient))
    ).rejects.toThrow(/missing column 'unresolved_ns'/);
  });

  it('links a group whose size equals the ceiling', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-okta', 'user-entra'],
              namespaces: ['okta', 'entra_id'],
              groupSize: GROUP_SIZE_CEILING,
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [entityHit('user-okta', 'okta'), entityHit('user-entra', 'entra_id')],
      },
    });

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledTimes(1);
  });

  it('cascade-links both existing targets when a higher-priority unresolved member wins', async () => {
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-ad'],
              namespaces: ['active_directory'],
              existingTargets: ['user-okta', 'user-entra'],
              unresolvedCount: 1,
              groupSize: 3,
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          entityHit('user-ad', 'active_directory'),
          entityHit('user-okta', 'okta'),
          entityHit('user-entra', 'entra_id'),
        ],
      },
    });

    await runEsqlMatcherRule(createDeps(createInitialState(), mockEsClient, mockResolutionClient));

    expect(mockCascadeLink).toHaveBeenCalledWith('user-ad', ['user-okta', 'user-entra']);
  });

  it('skips a group that overlaps ids written earlier this tick and holds the watermark', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-08-01T00:00:00Z' });
    const mutatedIds = new Set(['user-okta']);
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'alice@corp.com',
              unresolvedIds: ['user-okta', 'user-entra'],
              namespaces: ['okta', 'entra_id'],
            }),
          ]
        )
      );

    const result = await runEsqlMatcherRule(
      createDeps(state, mockEsClient, mockResolutionClient, { mutatedIds })
    );

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.lastProcessedTimestamp).toBe('2026-08-01T00:00:00Z');
  });

  it('reports a mixed funnel where scanned equals applied plus skipped plus failed', async () => {
    const telemetry = { report: jest.fn() };
    (mockEsClient.esql.query as jest.Mock)
      .mockResolvedValueOnce(watermarkResponse('2026-08-10T00:00:00Z'))
      .mockResolvedValueOnce(
        esqlResponse(
          ['match_value', 'ids', 'unresolved_ns', 'existing_targets', 'unresolved_n', 'total_n'],
          [
            groupRow({
              matchValue: 'applied@corp.com',
              unresolvedIds: ['user-okta', 'user-entra'],
              namespaces: ['okta', 'entra_id'],
            }),
            groupRow({
              matchValue: 'ambiguous@corp.com',
              unresolvedIds: ['user-1', 'user-2'],
              namespaces: ['microsoft_365'],
              unresolvedCount: 2,
              groupSize: 2,
            }),
            groupRow({
              matchValue: 'oversized@corp.com',
              unresolvedIds: ['user-a', 'user-b'],
              namespaces: ['okta', 'entra_id'],
              unresolvedCount: 2,
              groupSize: GROUP_SIZE_CEILING + 1,
            }),
            groupRow({
              matchValue: 'noop@corp.com',
              unresolvedIds: [],
              namespaces: [],
              existingTargets: ['user-okta-noop'],
              unresolvedCount: 0,
              groupSize: 2,
            }),
            groupRow({
              matchValue: 'blocked@corp.com',
              unresolvedIds: ['user-blocked-a', 'user-blocked-b'],
              namespaces: ['okta', 'entra_id'],
            }),
            groupRow({
              matchValue: 'failed@corp.com',
              unresolvedIds: ['user-fail-a', 'user-fail-b'],
              namespaces: ['okta', 'entra_id'],
            }),
          ]
        )
      );
    (mockEsClient.search as jest.Mock).mockImplementation(async ({ query }) => {
      const ids: string[] = query.bool.filter[0].terms['entity.id'];
      return {
        hits: {
          hits: ids.map((id) =>
            entityHit(id, id.includes('okta') || id.endsWith('-a') ? 'okta' : 'entra_id')
          ),
        },
      };
    });
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
