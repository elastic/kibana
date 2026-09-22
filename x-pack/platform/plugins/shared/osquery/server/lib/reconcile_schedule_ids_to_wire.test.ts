/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelDataBackfillChange,
} from '@kbn/core-saved-objects-server';
import { reconcileScheduleIdsToWire } from './reconcile_schedule_ids_to_wire';
import { packSavedObjectModelVersion4 } from './saved_query/saved_object_model_versions';

// Version-agnostic: V4 mints deterministic UUIDv5 schedule_ids (was v4), and
// any pre-existing value is preserved as-is, so match any valid UUID version.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createMockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  get: jest.fn(),
  isLevelEnabled: jest.fn().mockReturnValue(true),
});

/**
 * Build a mock SO find result for a pack SO (used by the space-scoped client
 * `find()` call the reconciler makes when looking up a pack by name).
 */
const buildPackSOFindResult = (id: string, name: string, attrs: Record<string, unknown> = {}) => ({
  saved_objects: [
    {
      id,
      type: 'osquery-pack',
      score: 1,
      references: [],
      attributes: {
        name,
        enabled: true,
        created_at: '2026-01-01T00:00:00.000Z',
        queries: [
          { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
          { id: 'q2', query: 'SELECT 2', interval: 120, name: 'q2', schedule_id: 'sched-q2' },
        ],
        ...attrs,
      },
    },
  ],
  total: 1,
  page: 1,
  per_page: 1,
});

/**
 * Create a mock space-scoped client.
 * `packSOsByName` maps pack name → attributes to return from find().
 */
const createMockScopedClient = (
  packSOsByName: Record<string, { id: string; attrs: Record<string, unknown> }> = {}
) => ({
  find: jest.fn().mockImplementation(({ filter }: { filter: string }) => {
    // Extract pack name from filter `osquery-pack.attributes.name: "packName"`.
    const match = filter.match(/"([^"]+)"/);
    const packName = match?.[1];
    const entry = packName ? packSOsByName[packName] : undefined;
    if (entry) {
      return Promise.resolve(buildPackSOFindResult(entry.id, packName!, entry.attrs));
    }

    return Promise.resolve({ saved_objects: [], total: 0, page: 1, per_page: 1 });
  }),
  update: jest.fn().mockResolvedValue({}),
  bulkGet: jest.fn().mockResolvedValue({ saved_objects: [] }),
});

const createMockCoreStart = (scopedClient: ReturnType<typeof createMockScopedClient>) =>
  ({
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue({
        // The new reconciler doesn't use PIT — but keep it to avoid errors
        // if something unexpected touches it.
        createPointInTimeFinder: jest.fn().mockReturnValue({
          close: jest.fn().mockResolvedValue(undefined),
          async *find() {
            yield { saved_objects: [] };
          },
        }),
      }),
      getScopedClient: jest.fn().mockReturnValue(scopedClient),
    },
    http: {},
    elasticsearch: {
      client: { asInternalUser: {} },
    },
  } as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['coreStart']);

// Yields the drain as one batch (the common case for package-policy drain).
const mockFetchAllItems = (items: unknown[]) =>
  jest.fn().mockImplementation(async function* asyncGenerator() {
    yield items;
  });

const mockFetchAllItemsBatches = (batches: unknown[][]) =>
  jest.fn().mockImplementation(async function* asyncGenerator() {
    for (const batch of batches) {
      yield batch;
    }
  });

const createMockOsqueryContext = (packagePolicyService?: unknown) =>
  ({
    getPackagePolicyService: jest.fn().mockReturnValue(
      packagePolicyService ?? {
        fetchAllItems: mockFetchAllItems([]),
        update: jest.fn().mockResolvedValue({}),
      }
    ),
  } as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['osqueryContext']);

/**
 * Build a package policy carrying a single pack block.
 */
interface WirePackBlock {
  shard?: number;
  pack_id?: string;
  pack_name?: string;
  queries?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

const buildPackagePolicy = (
  packKey = 'default--reconcile-pack',
  packId = 'pack-1',
  extraPacks: Record<string, WirePackBlock> = {}
) => ({
  id: 'pp-1',
  policy_ids: ['policy-1'],
  package: { name: 'osquery_manager', version: '1.0.0' },
  inputs: [
    {
      type: 'osquery',
      streams: [] as unknown[],
      config: {
        osquery: {
          value: {
            packs: {
              [packKey]: { shard: 100, pack_id: packId, queries: {} },
              ...extraPacks,
            } as Record<string, WirePackBlock>,
          },
        },
      },
    },
  ],
});

/**
 * Default pack SO entry — reconcile-pack with two queries.
 */
const DEFAULT_PACK_ENTRY = {
  id: 'pack-1',
  attrs: {
    name: 'reconcile-pack',
    enabled: true,
    created_at: '2026-01-01T00:00:00.000Z',
    queries: [
      { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
      { id: 'q2', query: 'SELECT 2', interval: 120, name: 'q2', schedule_id: 'sched-q2' },
    ],
  },
};

/**
 * A pack SO entry whose `attrs.name` matches the name it is keyed under.
 * `buildPackSOFindResult` spreads `attrs` after `name`, so reusing
 * DEFAULT_PACK_ENTRY (named `reconcile-pack`) under a different key would
 * clobber the name and fail the reconciler's exact-match re-check.
 */
const MYPACK_ENTRY = {
  id: 'pack-1',
  attrs: {
    name: 'mypack',
    enabled: true,
    created_at: '2026-01-01T00:00:00.000Z',
    queries: [{ id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' }],
  },
};

/** Minimal structural view for reaching into a built policy's pack blocks. */
interface PackagePolicyShape {
  inputs: Array<{ config: { osquery: { value: { packs: Record<string, WirePackBlock> } } } }>;
}

describe('reconcileScheduleIdsToWire', () => {
  test('picks the exactly-named pack SO when the analyzed-text filter returns fuzzy matches', async () => {
    // `osquery-pack.attributes.name` is mapped as analyzed `text`, so a filter
    // for "reconcile-pack" also returns e.g. "reconcile-pack extended". Taking
    // saved_objects[0] blindly would project the WRONG pack's queries onto this
    // policy's block. The reconciler must re-check the name exactly.
    const decoyFirst = {
      saved_objects: [
        {
          id: 'pack-decoy',
          type: 'osquery-pack',
          score: 1,
          references: [],
          attributes: {
            name: 'reconcile-pack extended',
            enabled: true,
            created_at: '2026-01-01T00:00:00.000Z',
            queries: [
              {
                id: 'decoy',
                query: 'SELECT 999',
                interval: 60,
                name: 'decoy',
                schedule_id: 'nope',
              },
            ],
          },
        },
        {
          id: 'pack-1',
          type: 'osquery-pack',
          score: 0.5,
          references: [],
          attributes: {
            name: 'reconcile-pack',
            enabled: true,
            created_at: '2026-01-01T00:00:00.000Z',
            queries: [
              { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
            ],
          },
        },
      ],
      total: 2,
      page: 1,
      per_page: 100,
    };

    const scopedClient = {
      find: jest.fn().mockResolvedValue(decoyFirst),
      update: jest.fn().mockResolvedValue({}),
      bulkGet: jest.fn().mockResolvedValue({ saved_objects: [] }),
    };

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const core = createMockCoreStart(scopedClient as never);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: mockFetchAllItems([buildPackagePolicy()]),
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    const packBlock =
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];
    // The exact-name SO won, not the higher-scoring decoy.
    expect(packBlock.pack_id).toBe('pack-1');
    expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
    expect(packBlock.queries.decoy).toBeUndefined();
  });

  test('finds the exact-named pack SO when fuzzy matches fill the entire first page', async () => {
    // 100 fuzzy matches ("reconcile-pack extended N") crowd page 1; the exact
    // SO only arrives on page 2. A single-page lookup would skip the pack
    // forever with just a warning.
    const decoy = (n: number) => ({
      id: `pack-decoy-${n}`,
      type: 'osquery-pack',
      score: 1,
      references: [],
      attributes: {
        name: `reconcile-pack extended ${n}`,
        enabled: true,
        created_at: '2026-01-01T00:00:00.000Z',
        queries: [{ id: 'decoy', query: 'SELECT 999', interval: 60, name: 'decoy' }],
      },
    });
    const exactSO = {
      id: 'pack-1',
      type: 'osquery-pack',
      score: 0.1,
      references: [],
      attributes: DEFAULT_PACK_ENTRY.attrs,
    };

    const scopedClient = {
      find: jest.fn().mockImplementation(({ page = 1 }: { page?: number }) => {
        if (page === 1) {
          return Promise.resolve({
            saved_objects: Array.from({ length: 100 }, (_, n) => decoy(n)),
            total: 101,
            page: 1,
            per_page: 100,
          });
        }

        return Promise.resolve({ saved_objects: [exactSO], total: 101, page, per_page: 100 });
      }),
      update: jest.fn().mockResolvedValue({}),
      bulkGet: jest.fn().mockResolvedValue({ saved_objects: [] }),
    };

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const core = createMockCoreStart(scopedClient as never);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: mockFetchAllItems([buildPackagePolicy()]),
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    expect(scopedClient.find).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    const packBlock =
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];
    expect(packBlock.pack_id).toBe('pack-1');
    expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
  });

  test('drains package policies across ALL spaces (spaceIds wildcard)', async () => {
    // With Fleet space awareness enabled, the internal SO client is scoped to
    // the default space; without the wildcard the reconciler would never see —
    // and never repair — policies living in other spaces.
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: jest.fn().mockResolvedValue({}),
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(packagePolicyList).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ spaceIds: ['*'] })
    );
  });

  test('is idempotent for a pack with no created_at (deterministic anchor, no per-run rewrite)', async () => {
    // Degenerate packs (NDJSON imports) have neither start_date on their
    // queries nor created_at to anchor to. The emitted fallback must be
    // deterministic: a time-of-write now() would fail the isEqual gate on
    // every run — one policy rewrite (agent redeploy + re-anchored execution
    // numbering) per Kibana restart.
    const noCreatedAtAttrs = {
      name: 'reconcile-pack',
      enabled: true,
      // Explicit: the mock builder injects a default created_at otherwise.
      created_at: undefined,
      queries: [{ id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' }],
    };
    const scopedClient = createMockScopedClient({
      'reconcile-pack': { id: 'pack-1', attrs: noCreatedAtAttrs },
    });
    const packagePolicyUpdate = jest
      .fn()
      .mockImplementation(async (_sc, _es, id, updated) => ({ ...updated, id }));

    const run = (policies: unknown[]) =>
      reconcileScheduleIdsToWire({
        coreStart: createMockCoreStart(scopedClient),
        osqueryContext: createMockOsqueryContext({
          fetchAllItems: mockFetchAllItems(policies),
          update: packagePolicyUpdate,
        }),
        logger: createMockLogger() as unknown as Parameters<
          typeof reconcileScheduleIdsToWire
        >[0]['logger'],
      });

    await run([buildPackagePolicy()]);
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    const writtenBlock =
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];
    // Deterministic anchor, never a time-of-write value.
    expect(writtenBlock.queries.q1.start_date).toBe('1970-01-01T00:00:00.000Z');

    // Second run against the written policy: in sync, no rewrite.
    const reconciledPolicy = { ...packagePolicyUpdate.mock.calls[0][3], id: 'pp-1' };
    await run([reconciledPolicy]);
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
  });

  test('anchors start_date to the pack SO created_at (not the epoch sentinel)', async () => {
    // Mutation guard: deleting `fallbackStartDate: packAttrs.created_at` left
    // the suite green, since the only start_date assertion was in the fixture
    // that HAS no created_at (expecting the sentinel either way).
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});

    await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([buildPackagePolicy()]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    const writtenBlock =
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];
    expect(writtenBlock.queries.q1.start_date).toBe('2026-01-01T00:00:00.000Z');
    expect(writtenBlock.queries.q2.start_date).toBe('2026-01-01T00:00:00.000Z');
  });

  test('resolves space and pack name from the policy/block, never by splitting the key on "--"', async () => {
    // "Prod - EU" slugifies to `prod---eu`, so `prod---eu--my--pack` has `--`
    // in BOTH halves. Splitting on the first (or last) one mis-attributes the
    // block, and makePackKey(parse(key)) round-trips — so the write would land
    // in place carrying another pack's queries.
    const packKey = 'prod---eu--my--pack';
    const policy = {
      ...buildPackagePolicy(packKey, 'pack-1'),
      spaceIds: ['prod---eu'],
    };
    // The block names itself; no parsing required.
    policy.inputs[0].config.osquery.value.packs[packKey].pack_name = 'my--pack';

    const scopedClient = createMockScopedClient({
      'my--pack': {
        id: 'pack-1',
        attrs: {
          name: 'my--pack',
          enabled: true,
          created_at: '2026-01-01T00:00:00.000Z',
          queries: [
            { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
          ],
        },
      },
    });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    // Looked up under the pack's REAL name, not the mis-split `-eu--my--pack`.
    expect(scopedClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ filter: expect.stringContaining('"my--pack"') })
    );
    // Written back under the same canonical key it was found at.
    const writtenPacks = packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs;
    expect(Object.keys(writtenPacks)).toEqual([packKey]);
    expect(writtenPacks[packKey].queries.q1.schedule_id).toBe('sched-q1');
  });

  test('scopes the write client to the policy own space, so cross-space writes do not 404', async () => {
    // Fleet's `update` reads through the client's namespace, so a client scoped
    // elsewhere 404s BEFORE the write and re-arms this one-shot forever.
    const policy = { ...buildPackagePolicy(), spaceIds: ['space-b'] };
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: jest.fn().mockResolvedValue({}),
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    // The scoped client is built for the policy's OWN space, not `default`.
    expect(getScopedClient).toHaveBeenCalledTimes(1);
    const [scopingRequest] = getScopedClient.mock.calls[0];
    expect(String((scopingRequest as { spaceId?: unknown }).spaceId)).toBe('space-b');
  });

  test('flags hadFailures when a pack SO lookup THROWS (transient ES fault, not an absent SO)', async () => {
    // A throwing lookup is a blip (503/timeout); reporting success would record
    // completed:true and make it permanent non-repair.
    const scopedClient = {
      find: jest.fn().mockRejectedValue(new Error('es_rejected_execution_exception')),
      update: jest.fn().mockResolvedValue({}),
      bulkGet: jest.fn().mockResolvedValue({ saved_objects: [] }),
    };
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});

    const result = await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([buildPackagePolicy()]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(true);
    expect(packagePolicyUpdate).not.toHaveBeenCalled();
  });

  test('skips a pack with no queries instead of writing an empty block every pass', async () => {
    const scopedClient = createMockScopedClient({
      'reconcile-pack': {
        id: 'pack-1',
        attrs: {
          name: 'reconcile-pack',
          enabled: true,
          created_at: '2026-01-01T00:00:00.000Z',
          queries: [],
        },
      },
    });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});

    const result = await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([buildPackagePolicy()]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    expect(packagePolicyUpdate).not.toHaveBeenCalled();
  });

  test('still repairs a DISABLED but still-wired pack in place (never detaches)', async () => {
    // `enabled` is deliberately NOT gated on — detaching is the edit/delete
    // routes' job, never the reconciler's.
    const scopedClient = createMockScopedClient({
      'reconcile-pack': {
        id: 'pack-1',
        attrs: { ...DEFAULT_PACK_ENTRY.attrs, enabled: false },
      },
    });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});

    await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([buildPackagePolicy()]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    const writtenPacks = packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs;
    // Rewritten in place, not removed.
    expect(writtenPacks['default--reconcile-pack'].queries.q1.schedule_id).toBe('sched-q1');
  });

  test('does not send spaceIds in the Fleet update payload', async () => {
    // Fleet's `update` doesn't strip `spaceIds` — only its callback chain does.
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});

    await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([{ ...buildPackagePolicy(), spaceIds: ['default'] }]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(packagePolicyUpdate.mock.calls[0][3]).not.toHaveProperty('spaceIds');
    expect(packagePolicyUpdate.mock.calls[0][3]).not.toHaveProperty('id');
  });
  test('same pack NAME in two spaces resolves to each space own SO (no cross-wiring)', async () => {
    // Wire-first groups by the policy's space, so two policies in different
    // spaces carrying an identically-named pack must each look their SO up
    // through their OWN space client and get their OWN schedule_id.
    const policyA = {
      ...buildPackagePolicy('space-a--reconcile-pack'),
      id: 'pp-a',
      spaceIds: ['space-a'],
    };
    const policyB = {
      ...buildPackagePolicy('space-b--reconcile-pack'),
      id: 'pp-b',
      spaceIds: ['space-b'],
    };

    const clientsBySpace: Record<string, ReturnType<typeof createMockScopedClient>> = {
      'space-a': createMockScopedClient({
        'reconcile-pack': {
          id: 'pack-a',
          attrs: {
            name: 'reconcile-pack',
            enabled: true,
            created_at: '2026-01-01T00:00:00.000Z',
            queries: [
              { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-A' },
            ],
          },
        },
      }),
      'space-b': createMockScopedClient({
        'reconcile-pack': {
          id: 'pack-b',
          attrs: {
            name: 'reconcile-pack',
            enabled: true,
            created_at: '2026-01-01T00:00:00.000Z',
            queries: [
              { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-B' },
            ],
          },
        },
      }),
    };

    const core = createMockCoreStart(clientsBySpace['space-a']);
    (core.savedObjects.getScopedClient as jest.Mock) = jest
      .fn()
      .mockImplementation((req: { spaceId?: unknown }) => clientsBySpace[String(req.spaceId)]);

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policyA, policyB]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(packagePolicyUpdate).toHaveBeenCalledTimes(2);
    const byPolicyId = Object.fromEntries(
      packagePolicyUpdate.mock.calls.map((call) => [call[2], call[3]])
    );
    // Each policy gets its OWN space's pack, keyed for its own space.
    expect(
      byPolicyId['pp-a'].inputs[0].config.osquery.value.packs['space-a--reconcile-pack'].queries.q1
        .schedule_id
    ).toBe('sched-A');
    expect(
      byPolicyId['pp-b'].inputs[0].config.osquery.value.packs['space-b--reconcile-pack'].queries.q1
        .schedule_id
    ).toBe('sched-B');
  });

  test('a policy with no spaceIds and a bare-named key falls back to the default space', async () => {
    // Space awareness disabled (or a pre-migration policy) leaves `spaceIds`
    // undefined; the block must still resolve rather than land in a space
    // whose scoped client would 404 the write. This pins the DEFAULT half of
    // the fallback only — see the `security--` tests below for the half that
    // must NOT collapse to `default`.
    const { spaceIds: _omit, ...policyWithoutSpaceIds } = {
      ...buildPackagePolicy('reconcile-pack'),
      spaceIds: undefined,
    } as Record<string, unknown>;
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policyWithoutSpaceIds]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    expect(String(getScopedClient.mock.calls[0][0].spaceId)).toBe('default');
    expect(
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ].queries.q1.schedule_id
    ).toBe('sched-q1');
  });

  test('a policy shared across multiple spaces is written through its first space', async () => {
    // Fleet can list several spaceIds on one policy. We must pick one
    // deterministically — writing through a space the policy is not in 404s.
    const policy = {
      ...buildPackagePolicy('space-a--reconcile-pack'),
      spaceIds: ['space-a', 'space-b'],
    };
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    // Exactly one write, through space-a, keyed for space-a — not once per space.
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    expect(String(getScopedClient.mock.calls[0][0].spaceId)).toBe('space-a');
    expect(
      Object.keys(packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs)
    ).toEqual(['space-a--reconcile-pack']);
  });

  test('a block whose key space disagrees with a DECLARED policy space is skipped, not mis-written', async () => {
    // e.g. a `default--`-keyed block sitting on a space-a policy. `spaceIds` is
    // SET here, so it is authoritative: the SO is looked up in space-a and
    // legitimately not found — warn and skip. It must NOT fall back to the key's
    // space and write a block built from another space's pack.
    // (The inverse — `spaceIds` UNSET, where the key IS the only evidence and
    // must be trusted — is pinned by the `security--` tests below.)
    const policy = { ...buildPackagePolicy(), spaceIds: ['space-a'] };
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    // Only the default-space client knows this pack; space-a's find returns none.
    scopedClient.find = jest.fn().mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 1,
    });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: packagePolicyUpdate,
      }),
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(packagePolicyUpdate).not.toHaveBeenCalled();
    // An absent SO is not a transient fault, so the one-shot still completes.
    expect(result.hadFailures).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no pack SO found for key'));
  });

  test('a pre-migration policy (spaceIds unset) resolves the space from the block key', async () => {
    // Fleet space awareness needs `useSpaceAwareness` AND a successful migration;
    // until then every Fleet read gates `spaceIds` off and it arrives undefined.
    // osquery keys blocks off the KIBANA active space regardless, so a
    // `security--`-keyed block must resolve to `security`, not `default`.
    // Collapsing to `default` writes `default--mypack` beside the untouched
    // `security--mypack` (removePackFromPolicy only unsets canonical + bare),
    // leaving the agent running a DUPLICATED schedule.
    const { spaceIds: _omit, ...policyWithoutSpaceIds } = {
      ...buildPackagePolicy('security--mypack', 'pack-1'),
      spaceIds: undefined,
    } as Record<string, unknown>;
    // The block is modern (carries `pack_name`), so the name lookup succeeds in
    // whichever space we scope to — which is exactly why a wrong space is silent.
    (
      (policyWithoutSpaceIds as unknown as PackagePolicyShape).inputs[0].config.osquery.value.packs[
        'security--mypack'
      ] as WirePackBlock
    ).pack_name = 'mypack';

    const scopedClient = createMockScopedClient({ mypack: MYPACK_ENTRY });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policyWithoutSpaceIds]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    expect(String(getScopedClient.mock.calls[0][0].spaceId)).toBe('security');
    // Exactly ONE key survives — no `default--mypack` duplicate alongside it.
    const writtenPacks = packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs;
    expect(Object.keys(writtenPacks)).toEqual(['security--mypack']);
    expect(writtenPacks['security--mypack'].queries.q1.schedule_id).toBe('sched-q1');
  });

  test('a pre-migration policy does not adopt a namesake pack from the default space', async () => {
    // Worst case of the above: a pack named `mypack` also exists in `default`.
    // Scoping to `default` would write THAT pack's pack_id/queries under
    // `default--mypack` while `security--mypack` survives untouched.
    const { spaceIds: _omit, ...policyWithoutSpaceIds } = {
      ...buildPackagePolicy('security--mypack', 'pack-SECURITY'),
      spaceIds: undefined,
    } as Record<string, unknown>;
    (
      (policyWithoutSpaceIds as unknown as PackagePolicyShape).inputs[0].config.osquery.value.packs[
        'security--mypack'
      ] as WirePackBlock
    ).pack_name = 'mypack';

    // Only ONE client is handed out by the mock, so if the reconciler scoped to
    // the wrong space it would still find this SO — the pack_id assertion is
    // what catches the mis-attribution.
    const scopedClient = createMockScopedClient({
      mypack: { id: 'pack-DEFAULT-SPACE-COPY', attrs: { ...MYPACK_ENTRY.attrs } },
    });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policyWithoutSpaceIds]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(String(getScopedClient.mock.calls[0][0].spaceId)).toBe('security');
    const writtenPacks = packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs;
    expect(Object.keys(writtenPacks)).toEqual(['security--mypack']);
    expect(writtenPacks['default--mypack']).toBeUndefined();
  });

  test('a pre-migration LEGACY bare-key block resolves its space and name from the key', async () => {
    // Legacy block: no `pack_name`, so the name comes from the key. With
    // `spaceIds` unset, stripping only a `default--` prefix leaves the WHOLE key
    // as the pack name — the lookup for a pack literally named
    // `security--mypack` finds nothing and the block never repairs.
    const { spaceIds: _omit, ...policyWithoutSpaceIds } = {
      ...buildPackagePolicy('security--mypack', 'pack-1'),
      spaceIds: undefined,
    } as Record<string, unknown>;

    const scopedClient = createMockScopedClient({ mypack: MYPACK_ENTRY });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policyWithoutSpaceIds]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    // The ambiguous key is probed by candidate: the bare whole-key reading is
    // tried first (the common shape), then the `security`/`mypack` split that a
    // real pack SO actually backs. What matters is that the STRIPPED name is
    // probed at all — pinning call order would just pin the probe order.
    const probedFilters = scopedClient.find.mock.calls.map(
      (call: [{ filter: string }]) => call[0].filter
    );
    expect(probedFilters.some((filter: string) => filter.includes('"mypack"'))).toBe(true);
    // The write client is scoped to the space the evidence resolved to.
    const writeScopes = getScopedClient.mock.calls.map((call: [{ spaceId?: unknown }]) =>
      String(call[0].spaceId)
    );
    expect(writeScopes).toContain('security');
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    expect(
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs['security--mypack']
        .queries.q1.schedule_id
    ).toBe('sched-q1');
  });

  test('an all-spaces policy (spaceIds ["*"]) collapses to the default space', async () => {
    // The drain requests `spaceIds: ['*']`, so an all-spaces policy is directly
    // reachable. Using the sentinel verbatim scopes the write client to the
    // literal space `*` and writes a junk `*--mypack` key. Fleet's own
    // `getValidSpaceId` maps `*` to the default space; we mirror that.
    const policy = { ...buildPackagePolicy('default--mypack', 'pack-1'), spaceIds: ['*'] };
    (
      (policy as unknown as PackagePolicyShape).inputs[0].config.osquery.value.packs[
        'default--mypack'
      ] as WirePackBlock
    ).pack_name = 'mypack';

    const scopedClient = createMockScopedClient({ mypack: MYPACK_ENTRY });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    expect(String(getScopedClient.mock.calls[0][0].spaceId)).toBe('default');
    expect(
      Object.keys(packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs)
    ).toEqual(['default--mypack']);
  });

  test('a DASHED space id resolves exactly when the block carries pack_name', async () => {
    // The Spaces UI slugifies "Prod - EU" to `prod---eu`, and the pack is named
    // `my--pack` — so `--` appears in BOTH halves of `prod---eu--my--pack`.
    // Splitting on any single `--` mis-attributes the block; `pack_name` pins
    // the boundary exactly, so the space is recovered without guessing.
    const { spaceIds: _omit, ...policy } = {
      ...buildPackagePolicy('prod---eu--my--pack', 'pack-1'),
      spaceIds: undefined,
    } as Record<string, unknown>;
    (
      (policy as unknown as PackagePolicyShape).inputs[0].config.osquery.value.packs[
        'prod---eu--my--pack'
      ] as WirePackBlock
    ).pack_name = 'my--pack';

    const scopedClient = createMockScopedClient({
      'my--pack': {
        id: 'pack-1',
        attrs: {
          name: 'my--pack',
          enabled: true,
          created_at: '2026-01-01T00:00:00.000Z',
          queries: [
            { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
          ],
        },
      },
    });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    expect(String(getScopedClient.mock.calls[0][0].spaceId)).toBe('prod---eu');
    // The original key is repaired in place — no `prod--...` duplicate appears.
    expect(
      Object.keys(packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs)
    ).toEqual(['prod---eu--my--pack']);
  });

  test('an ambiguous legacy key resolves to the candidate split a real pack SO backs', async () => {
    // Legacy block: no `pack_name`, dashes on both sides, `spaceIds` unset — the
    // boundary is unknowable from the key alone. Rather than commit to a blind
    // split, each candidate is probed and only the one matching an actual pack
    // is used, so the correct `prod---eu` / `my--pack` reading wins over the
    // `prod` / `-eu--my--pack` one.
    const { spaceIds: _omit, ...policy } = {
      ...buildPackagePolicy('prod---eu--my--pack', 'pack-1'),
      spaceIds: undefined,
    } as Record<string, unknown>;

    const scopedClient = createMockScopedClient({
      'my--pack': {
        id: 'pack-1',
        attrs: {
          name: 'my--pack',
          enabled: true,
          created_at: '2026-01-01T00:00:00.000Z',
          queries: [
            { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
          ],
        },
      },
    });
    const getScopedClient = jest.fn().mockReturnValue(scopedClient);
    const core = createMockCoreStart(scopedClient);
    (core.savedObjects.getScopedClient as jest.Mock) = getScopedClient;

    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    const writeScopes = getScopedClient.mock.calls.map((call: [{ spaceId?: unknown }]) =>
      String(call[0].spaceId)
    );
    expect(writeScopes).toContain('prod---eu');
    expect(
      Object.keys(packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs)
    ).toEqual(['prod---eu--my--pack']);
  });

  test('a transient fault while probing an ambiguous legacy key re-arms the one-shot', async () => {
    // The probe issues its own `find`s, so a 503 there must set hadFailures
    // rather than fall through to the blind default split — and it must not be
    // swallowed by the "no pack blocks found" early return.
    const { spaceIds: _omit, ...policy } = {
      ...buildPackagePolicy('prod---eu--my--pack', 'pack-1'),
      spaceIds: undefined,
    } as Record<string, unknown>;

    const scopedClient = {
      find: jest.fn().mockRejectedValue(new Error('es_rejected_execution_exception')),
      update: jest.fn().mockResolvedValue({}),
      bulkGet: jest.fn().mockResolvedValue({ saved_objects: [] }),
    };
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: packagePolicyUpdate,
      }),
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result.hadFailures).toBe(true);
    expect(packagePolicyUpdate).not.toHaveBeenCalled();
  });

  test('a legacy bare-key block whose name itself contains "--" is not truncated', async () => {
    // Legacy blocks predate `pack_name`, so the key IS the name. Stripping a
    // `${spaceId}--` prefix must not also eat the `--` inside the name.
    const policy = {
      ...buildPackagePolicy('my--pack', 'pack-1'),
      spaceIds: ['default'],
    };
    const scopedClient = createMockScopedClient({
      'my--pack': {
        id: 'pack-1',
        attrs: {
          name: 'my--pack',
          enabled: true,
          created_at: '2026-01-01T00:00:00.000Z',
          queries: [
            { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
          ],
        },
      },
    });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});

    const result = await reconcileScheduleIdsToWire({
      coreStart: createMockCoreStart(scopedClient),
      osqueryContext: createMockOsqueryContext({
        fetchAllItems: mockFetchAllItems([policy]),
        update: packagePolicyUpdate,
      }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    expect(result.hadFailures).toBe(false);
    expect(scopedClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ filter: expect.stringContaining('"my--pack"') })
    );
    // Migrated to the canonical key, legacy key dropped.
    const writtenPacks = packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs;
    expect(Object.keys(writtenPacks)).toEqual(['default--my--pack']);
  });

  test('mints nothing on the Saved Object (no SO update call)', async () => {
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    // update() is on the scopedClient — it should NOT be called (that's the SO client)
    expect(scopedClient.update).not.toHaveBeenCalled();
    // The package policy service update IS called (to repair the wire).
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
  });

  test('projects the SO schedule_id onto the Fleet wire', async () => {
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    const updatedPolicy = packagePolicyUpdate.mock.calls[0][3];
    const packBlock = updatedPolicy.inputs[0].config.osquery.value.packs['default--reconcile-pack'];
    expect(packBlock).toBeDefined();
    expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
    expect(packBlock.queries.q2.schedule_id).toBe('sched-q2');
    expect(packBlock.pack_id).toBe('pack-1');
    // Human-readable name is projected onto the wire for scheduled result docs.
    expect(packBlock.pack_name).toBe('reconcile-pack');
  });

  test('reconciles a pack whose queries are a record (map) onto the Fleet wire', async () => {
    const recordShapedAttrs = {
      ...DEFAULT_PACK_ENTRY.attrs,
      queries: {
        q1: { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
        q2: { id: 'q2', query: 'SELECT 2', interval: 120, name: 'q2', schedule_id: 'sched-q2' },
      } as unknown as Array<Record<string, unknown>>,
    };
    const scopedClient = createMockScopedClient({
      'reconcile-pack': { id: 'pack-1', attrs: recordShapedAttrs },
    });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    const packBlock =
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];
    expect(packBlock).toBeDefined();
    expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
    expect(packBlock.queries.q2.schedule_id).toBe('sched-q2');
    expect(packBlock.pack_id).toBe('pack-1');
  });

  test('returns early when no osquery package policies exist', async () => {
    const scopedClient = createMockScopedClient({});
    const packagePolicyList = mockFetchAllItems([]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: jest.fn(),
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    expect(logger.debug).toHaveBeenCalledWith(
      'reconcileScheduleIdsToWire: no osquery package policies found'
    );
  });

  test('returns early when policies exist but carry no pack blocks', async () => {
    const emptyPolicy = {
      id: 'pp-1',
      policy_ids: ['policy-1'],
      package: { name: 'osquery_manager', version: '1.0.0' },
      inputs: [{ type: 'osquery', streams: [], config: { osquery: { value: { packs: {} } } } }],
    };
    const scopedClient = createMockScopedClient({});
    const packagePolicyList = mockFetchAllItems([emptyPolicy]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: jest.fn(),
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    expect(logger.debug).toHaveBeenCalledWith(
      'reconcileScheduleIdsToWire: no pack blocks found in any package policy'
    );
  });

  // Wire-first: a pack with no SO references is repaired if it appears on the wire.
  test('repairs a pack block whose SO has no agent-policy references (reference-less repair)', async () => {
    const noRefAttrs = {
      ...DEFAULT_PACK_ENTRY.attrs,
      // Simulate a pack SO with no references (the old gate would skip this).
    };
    const scopedClient = createMockScopedClient({
      'reconcile-pack': { id: 'pack-1', attrs: noRefAttrs },
    });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    // Block is repaired — references don't gate the write.
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    const packBlock =
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];
    expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
  });

  // Wire-first: a disabled pack that still appears on the wire is repaired (not detached).
  test('repairs a disabled-but-wired pack without detaching it', async () => {
    const disabledAttrs = { ...DEFAULT_PACK_ENTRY.attrs, enabled: false };
    const scopedClient = createMockScopedClient({
      'reconcile-pack': { id: 'pack-1', attrs: disabledAttrs },
    });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    // Repair happened (no detach — that's #279252's territory).
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    const updatedPacks = packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs;
    // Block is still present (not removed), with repaired queries.
    expect(updatedPacks['default--reconcile-pack']).toBeDefined();
    expect(updatedPacks['default--reconcile-pack'].queries.q1.schedule_id).toBe('sched-q1');
  });

  // Wire-first: an orphan block (no matching pack SO) is skipped with a warning.
  test('skips an orphan wire block (no matching pack SO) and logs a warning', async () => {
    // scopedClient returns no SO for any name lookup (empty find).
    const scopedClient = createMockScopedClient({});
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    // No write — nothing to source metadata from.
    expect(packagePolicyUpdate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no pack SO found for key "default--reconcile-pack"')
    );
  });

  // Diff-before-write: if the wire already matches the intended block, no write.
  test('skips the package-policy write when the wire block already matches the SO (no revision churn)', async () => {
    // First pass: build the in-sync policy from a real reconcile run.
    const firstUpdate = jest
      .fn()
      .mockImplementation(async (_sc, _es, id, updated) => ({ ...updated, id }));
    const firstList = mockFetchAllItems([buildPackagePolicy()]);

    const firstCore = createMockCoreStart(
      createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY })
    );
    await reconcileScheduleIdsToWire({
      coreStart: firstCore,
      osqueryContext: createMockOsqueryContext({ fetchAllItems: firstList, update: firstUpdate }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    const reconciledPolicy = { ...firstUpdate.mock.calls[0][3], id: 'pp-1' };
    expect(
      reconciledPolicy.inputs[0].config.osquery.value.packs['default--reconcile-pack'].shard
    ).toBe(100);

    // Second pass: reconcile against the already-written policy — no write expected.
    const secondUpdate = jest.fn().mockResolvedValue({});
    const secondList = mockFetchAllItems([reconciledPolicy]);
    const logger = createMockLogger();

    const secondCore = createMockCoreStart(
      createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY })
    );
    const result = await reconcileScheduleIdsToWire({
      coreStart: secondCore,
      osqueryContext: createMockOsqueryContext({ fetchAllItems: secondList, update: secondUpdate }),
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    expect(secondUpdate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('already in sync on policy pp-1, skipping write')
    );
  });

  test('preserves the wire-only `shard` field when it does write', async () => {
    const stalePolicy = buildPackagePolicy();
    stalePolicy.inputs[0].config.osquery.value.packs['default--reconcile-pack'].shard = 42;

    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([stalePolicy]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    const updatedPolicy = packagePolicyUpdate.mock.calls[0][3];
    const packBlock = updatedPolicy.inputs[0].config.osquery.value.packs['default--reconcile-pack'];
    expect(packBlock.shard).toBe(42);
    expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
  });

  test('migrates a legacy bare-name-keyed wire block to the spaceId--name key and preserves its `shard`', async () => {
    // Bare-name pack key (pre-space-scoping era).
    const legacyPolicy = buildPackagePolicy('reconcile-pack');
    legacyPolicy.inputs[0].config.osquery.value.packs['reconcile-pack'].shard = 7;

    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([legacyPolicy]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    const updatedPolicy = packagePolicyUpdate.mock.calls[0][3];
    const packs = updatedPolicy.inputs[0].config.osquery.value.packs;
    expect(packs['reconcile-pack']).toBeUndefined();
    expect(packs['default--reconcile-pack']).toBeDefined();
    expect(packs['default--reconcile-pack'].shard).toBe(7);
    expect(packs['default--reconcile-pack'].queries.q1.schedule_id).toBe('sched-q1');
  });

  test('is idempotent — a second run changes no schedule_id', async () => {
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest
      .fn()
      .mockImplementation(async (_sc, _es, id, updated) => ({ ...updated, id }));

    const run = (policies: unknown[]) => {
      const list = mockFetchAllItems(policies);

      return reconcileScheduleIdsToWire({
        coreStart: createMockCoreStart(scopedClient),
        osqueryContext: createMockOsqueryContext({
          fetchAllItems: list,
          update: packagePolicyUpdate,
        }),
        logger: createMockLogger() as unknown as Parameters<
          typeof reconcileScheduleIdsToWire
        >[0]['logger'],
      });
    };

    await run([buildPackagePolicy()]);
    const firstWire =
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];

    // Second run with the result of the first write.
    const reconciledPolicy = { ...packagePolicyUpdate.mock.calls[0][3], id: 'pp-1' };
    await run([reconciledPolicy]);

    // No second write because the policy is already in sync.
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
    expect(firstWire.queries.q1.schedule_id).toBe('sched-q1');
  });

  test('flags hadFailures on version conflict (409) so the one-shot task re-arms', async () => {
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Conflict'), { statusCode: 409 }));
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: true });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('version conflict for pack'));
  });

  test('classifies a Boom-shaped 409 (output.statusCode, no top-level statusCode) as a conflict', async () => {
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const boomConflict = Object.assign(new Error('Conflict'), { output: { statusCode: 409 } });
    const packagePolicyUpdate = jest.fn().mockRejectedValueOnce(boomConflict);
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: true });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('version conflict for pack'));
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('failed to repair pack'));
  });

  test('two stale packs sharing one policy converge in one pass (two updates, no self-inflicted 409)', async () => {
    const sharedPolicy = {
      id: 'pp-1',
      policy_ids: ['policy-1'],
      package: { name: 'osquery_manager', version: '1.0.0' },
      inputs: [
        {
          type: 'osquery',
          streams: [],
          config: {
            osquery: {
              value: {
                packs: {
                  'default--reconcile-pack': { shard: 100, pack_id: 'pack-1', queries: {} },
                  'default--second-pack': { shard: 100, pack_id: 'pack-2', queries: {} },
                },
              },
            },
          },
        },
      ],
    };

    const secondPackAttrs = {
      name: 'second-pack',
      enabled: true,
      created_at: '2026-01-01T00:00:00.000Z',
      queries: [{ id: 'q1', query: 'SELECT 9', interval: 90, name: 'q1', schedule_id: 'sched-p2' }],
    };

    const scopedClient = createMockScopedClient({
      'reconcile-pack': DEFAULT_PACK_ENTRY,
      'second-pack': { id: 'pack-2', attrs: secondPackAttrs },
    });

    // update echoes the written draft back with its id, mirroring Fleet's real return.
    const packagePolicyUpdate = jest
      .fn()
      .mockImplementation(async (_sc, _es, id, updated) => ({ ...updated, id }));
    const packagePolicyList = mockFetchAllItems([sharedPolicy]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(2);
    const secondWritePacks =
      packagePolicyUpdate.mock.calls[1][3].inputs[0].config.osquery.value.packs;
    expect(secondWritePacks['default--reconcile-pack'].queries.q1.schedule_id).toBe('sched-q1');
    expect(secondWritePacks['default--second-pack'].queries.q1.schedule_id).toBe('sched-p2');
  });

  test('logs and flags hadFailures on non-conflict errors', async () => {
    const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
    const packagePolicyUpdate = jest.fn().mockRejectedValueOnce(new Error('something went wrong'));
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const core = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: true });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to repair pack'));
    expect(logger.warn).toHaveBeenCalledWith(
      'reconcileScheduleIdsToWire: reconcile finished with partial failures, will retry'
    );
  });

  // The outer setup try/catch converts a pre-loop throw into a run result with
  // hadFailures rather than propagating.
  test('setup failure (fetchAllPackagePolicies throws) → resolves hadFailures, does NOT throw, logs error', async () => {
    const scopedClient = createMockScopedClient({});
    const logger = createMockLogger();

    const coreStart = createMockCoreStart(scopedClient);
    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: jest.fn().mockImplementation(() => {
        throw new Error('policy fetch failed');
      }),
      update: jest.fn(),
    });

    const resultPromise = reconcileScheduleIdsToWire({
      coreStart,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    await expect(resultPromise).resolves.toEqual({ hadFailures: true });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('setup failed, will retry: policy fetch failed')
    );
  });

  describe('pagination — multi-batch policy drain', () => {
    test('reconciles a pack whose target policy arrives on the SECOND fetchAllItems batch', async () => {
      const scopedClient = createMockScopedClient({ 'reconcile-pack': DEFAULT_PACK_ENTRY });
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});

      // The matching policy is only on batch 2.
      const unrelatedPolicy = buildPackagePolicy('default--unrelated', 'pack-x');
      const packagePolicyList = mockFetchAllItemsBatches([
        [unrelatedPolicy],
        [buildPackagePolicy()],
      ]);

      const core = createMockCoreStart(scopedClient);
      const osqueryContext = createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
      });

      expect(result).toEqual({ hadFailures: false });
      // reconcile-pack is repaired; unrelated doesn't have a matching SO (skipped).
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
      const packBlock =
        packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
          'default--reconcile-pack'
        ];
      expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
    });

    test('reconciles packs spread across two policies in two batches', async () => {
      const secondPackAttrs = {
        name: 'second-pack',
        enabled: true,
        created_at: '2026-02-01T00:00:00.000Z',
        queries: [
          { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-p2' },
        ],
      };
      const scopedClient = createMockScopedClient({
        'reconcile-pack': DEFAULT_PACK_ENTRY,
        'second-pack': { id: 'pack-2', attrs: secondPackAttrs },
      });
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});

      const packagePolicyList = mockFetchAllItemsBatches([
        [buildPackagePolicy()],
        [buildPackagePolicy('default--second-pack', 'pack-2')],
      ]);

      const core = createMockCoreStart(scopedClient);
      const osqueryContext = createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
      });

      expect(result).toEqual({ hadFailures: false });
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(2);
      const writtenKeys = packagePolicyUpdate.mock.calls.flatMap((call) =>
        Object.keys(call[3].inputs[0].config.osquery.value.packs)
      );
      expect(writtenKeys).toContain('default--second-pack');
    });
  });

  describe('abort signal granularity', () => {
    test('stops mid-space when aborted before a later pack (per-pack check, not per-space)', async () => {
      const sharedPolicy = {
        id: 'pp-shared',
        policy_ids: ['policy-1'],
        package: { name: 'osquery_manager', version: '1.0.0' },
        inputs: [
          {
            type: 'osquery',
            streams: [],
            config: {
              osquery: {
                value: {
                  packs: {
                    'default--reconcile-pack': { shard: 100, pack_id: 'pack-1', queries: {} },
                    'default--second-pack': { shard: 100, pack_id: 'pack-2', queries: {} },
                  },
                },
              },
            },
          },
        ],
      };

      const secondPackAttrs = {
        name: 'second-pack',
        enabled: true,
        created_at: '2026-01-01T00:00:00.000Z',
        queries: [
          { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-p2' },
        ],
      };

      const scopedClient = createMockScopedClient({
        'reconcile-pack': DEFAULT_PACK_ENTRY,
        'second-pack': { id: 'pack-2', attrs: secondPackAttrs },
      });

      const abortController = new AbortController();
      const packagePolicyUpdate = jest.fn().mockImplementation(async () => {
        abortController.abort();

        return {};
      });
      const packagePolicyList = mockFetchAllItems([sharedPolicy]);

      const core = createMockCoreStart(scopedClient);
      const osqueryContext = createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
        signal: abortController.signal,
      });

      expect(result).toEqual({ hadFailures: true });
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('aborted by task manager, will retry remaining packs')
      );
    });
  });

  describe('isRruleFeatureEnabled flag — Fleet wire fields on reconcile', () => {
    const rruleValue = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };

    const RRULE_PACK_ATTRS = {
      name: 'rrule-pack',
      enabled: true,
      created_at: '2026-01-01T00:00:00.000Z',
      schedule_type: 'rrule',
      rrule_schedule: rruleValue,
      interval: null,
      queries: [{ id: 'q1', query: 'SELECT 1', name: 'q1', schedule_id: 'sched-q1' }],
    };

    test('flag on + rrule-mode SO — wire carries default_rrule_schedule and schedule_id', async () => {
      const scopedClient = createMockScopedClient({
        'rrule-pack': { id: 'pack-rrule', attrs: RRULE_PACK_ATTRS },
      });
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy('default--rrule-pack', 'pack-rrule'),
      ]);

      const core = createMockCoreStart(scopedClient);
      const osqueryContext = createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
        isRruleFeatureEnabled: true,
      });

      expect(result).toEqual({ hadFailures: false });
      expect(scopedClient.update).not.toHaveBeenCalled();

      const packBlock =
        packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
          'default--rrule-pack'
        ];
      expect(packBlock.default_rrule_schedule).toEqual(rruleValue);
      expect(packBlock.default_native_schedule).toBeUndefined();
      expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
    });

    test('flag off + rrule-mode SO — wire omits rrule fields but still carries schedule_id', async () => {
      const scopedClient = createMockScopedClient({
        'rrule-pack': { id: 'pack-rrule', attrs: RRULE_PACK_ATTRS },
      });
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy('default--rrule-pack', 'pack-rrule'),
      ]);

      const core = createMockCoreStart(scopedClient);
      const osqueryContext = createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
        // isRruleFeatureEnabled omitted (defaults to false) — rollback gate.
      });

      expect(result).toEqual({ hadFailures: false });

      const packBlock =
        packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
          'default--rrule-pack'
        ];
      expect(packBlock.default_rrule_schedule).toBeUndefined();
      expect(packBlock.default_native_schedule).toBeUndefined();
      // schedule_id is mode-independent identity — present regardless of flag.
      expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
    });

    test('flag off + legacy interval pack — legacy per-query shape plus default_space_id and schedule_id', async () => {
      const legacyAttrs = {
        name: 'legacy-pack',
        enabled: true,
        created_at: '2026-01-01T00:00:00.000Z',
        queries: [
          { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
        ],
      };
      const scopedClient = createMockScopedClient({
        'legacy-pack': { id: 'pack-legacy', attrs: legacyAttrs },
      });
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy('default--legacy-pack', 'pack-legacy'),
      ]);

      const core = createMockCoreStart(scopedClient);
      const osqueryContext = createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
      });

      expect(result).toEqual({ hadFailures: false });

      const packBlock =
        packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
          'default--legacy-pack'
        ];
      expect(packBlock.queries.q1.interval).toBe(60);
      expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
      expect(packBlock.default_native_schedule).toBeUndefined();
      expect(packBlock.default_rrule_schedule).toBeUndefined();
      expect(packBlock.default_space_id).toBe('default');
    });
  });

  // End-to-end: legacy SO → real V4 backfill → reconciler → Fleet wire.
  describe('integration — legacy SO → model version V4 → reconciler → Fleet wire', () => {
    const backfillFn = (
      packSavedObjectModelVersion4.changes.find(
        (change): change is SavedObjectsModelDataBackfillChange => change.type === 'data_backfill'
      ) as SavedObjectsModelDataBackfillChange
    ).backfillFn as SavedObjectModelDataBackfillFn<
      { queries?: Array<Record<string, unknown>> },
      { queries?: Array<Record<string, unknown>> }
    >;

    test('legacy queries gain schedule_id via V4, and the reconciler carries them to the wire', async () => {
      const legacyQueries = [
        { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1' },
        { id: 'q2', query: 'SELECT 2', interval: 120, name: 'q2' },
      ];

      const migrated = backfillFn(
        {
          id: 'pack-legacy',
          type: 'osquery-pack',
          attributes: { queries: legacyQueries },
        } as any,
        {} as any
      ) as { attributes: { queries: Array<Record<string, unknown>> } };

      const migratedQueries = migrated.attributes.queries;
      migratedQueries.forEach((q) => expect(q.schedule_id).toMatch(UUID_REGEX));

      const legacyAttrs = {
        name: 'legacy-pack',
        enabled: true,
        created_at: '2026-01-01T00:00:00.000Z',
        queries: migratedQueries,
      };
      const scopedClient = createMockScopedClient({
        'legacy-pack': { id: 'pack-legacy', attrs: legacyAttrs },
      });
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy('default--legacy-pack', 'pack-legacy'),
      ]);

      const core = createMockCoreStart(scopedClient);
      const osqueryContext = createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
      });

      expect(result).toEqual({ hadFailures: false });
      expect(scopedClient.update).not.toHaveBeenCalled();

      const packBlock =
        packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
          'default--legacy-pack'
        ];
      expect(packBlock.queries.q1.schedule_id).toBe(migratedQueries[0].schedule_id);
      expect(packBlock.queries.q2.schedule_id).toBe(migratedQueries[1].schedule_id);
    });
  });
});
