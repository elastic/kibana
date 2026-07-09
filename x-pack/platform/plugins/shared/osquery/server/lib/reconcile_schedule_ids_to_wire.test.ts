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

const createMockScopedClient = () => ({
  find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0 }),
  update: jest.fn().mockResolvedValue({}),
  bulkGet: jest.fn().mockResolvedValue({ saved_objects: [] }),
});

// Accepts a single find result (yielded as one PIT batch) OR an explicit list
// of batches (each an array of saved_objects), so tests can exercise a
// multi-page pack finder.
const createMockCoreStart = (
  findResult: unknown = { saved_objects: [], total: 0 },
  scopedClient?: ReturnType<typeof createMockScopedClient>,
  findBatches?: unknown[][]
) => {
  const sc = scopedClient ?? createMockScopedClient();
  const batches = findBatches ?? [(findResult as { saved_objects: unknown[] }).saved_objects ?? []];

  return {
    core: {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({
          createPointInTimeFinder: jest.fn().mockReturnValue({
            close: jest.fn().mockResolvedValue(undefined),
            find: async function* asyncGenerator() {
              for (const batch of batches) {
                yield { saved_objects: batch };
              }
            },
          }),
        }),
        getScopedClient: jest.fn().mockReturnValue(sc),
      },
      http: {},
      elasticsearch: {
        client: { asInternalUser: {} },
      },
    } as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['coreStart'],
    scopedClient: sc,
  };
};

// Yields the drain as one batch (the common case).
const mockFetchAllItems = (items: unknown[]) =>
  jest.fn().mockImplementation(async function* asyncGenerator() {
    yield items;
  });

// Yields the drain across multiple batches so the target policy can arrive on
// a later page — the fetchAllItems consumer must drain ALL pages.
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

// Every query already carries schedule_id — the reconciler projects, never mints.
const buildEnabledPackFindResult = (overrides: Record<string, unknown> = {}) => ({
  saved_objects: [
    {
      id: 'pack-1',
      namespaces: ['default'],
      references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
      attributes: {
        name: 'reconcile-pack',
        enabled: true,
        queries: [
          { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
          { id: 'q2', query: 'SELECT 2', interval: 120, name: 'q2', schedule_id: 'sched-q2' },
        ],
        ...overrides,
      },
    },
  ],
  total: 1,
});

const buildPackagePolicy = (packKey = 'default--reconcile-pack', packId = 'pack-1') => ({
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
              [packKey]: { shard: 100, pack_id: packId, queries: {} },
            },
          },
        },
      },
    },
  ],
});

describe('reconcileScheduleIdsToWire', () => {
  test('mints nothing on the Saved Object (no SO update call)', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
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
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
  });

  test('projects the SO schedule_id onto the Fleet wire', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
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
  });

  // Regression: the old array-only guard (`queries?.length` → undefined for a
  // record) dropped record-shaped packs, so their schedule_id never reached the
  // wire. Assert the write path is REACHED, not just survival.
  test('reconciles an enabled pack whose queries are a record (map) onto the Fleet wire', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const recordShapedPack = buildEnabledPackFindResult({
      queries: {
        q1: { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
        q2: { id: 'q2', query: 'SELECT 2', interval: 120, name: 'q2', schedule_id: 'sched-q2' },
      },
    });

    const { core } = createMockCoreStart(recordShapedPack, scopedClient);
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
    // The write path is reached — the record shape is no longer dropped by the guard.
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

  // Empty record `{}` must be skipped exactly like an empty array `[]`.
  test('skips an enabled pack whose queries are an empty record (no Fleet write)', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const { core } = createMockCoreStart(buildEnabledPackFindResult({ queries: {} }), scopedClient);
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
    expect(packagePolicyUpdate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'reconcileScheduleIdsToWire: no enabled packs to reconcile'
    );
  });

  // Route-shaped wire: reconciler output plus the `shard` field routes always set.
  const buildInSyncPolicyFromFirstReconcile = async () => {
    const firstUpdate = jest.fn().mockResolvedValue({});
    const firstList = mockFetchAllItems([buildPackagePolicy()]);

    const seed = createMockCoreStart(buildEnabledPackFindResult(), createMockScopedClient());
    await reconcileScheduleIdsToWire({
      coreStart: seed.core,
      osqueryContext: createMockOsqueryContext({ fetchAllItems: firstList, update: firstUpdate }),
      logger: createMockLogger() as unknown as Parameters<
        typeof reconcileScheduleIdsToWire
      >[0]['logger'],
    });

    const reconciledPolicy = { ...firstUpdate.mock.calls[0][3], id: 'pp-1' };
    expect(
      reconciledPolicy.inputs[0].config.osquery.value.packs['default--reconcile-pack'].shard
    ).toBe(100);

    return reconciledPolicy;
  };

  test('skips the package-policy write when a route-shaped wire already matches the SO (no revision churn)', async () => {
    const reconciledPolicy = await buildInSyncPolicyFromFirstReconcile();

    const secondUpdate = jest.fn().mockResolvedValue({});
    const secondList = mockFetchAllItems([reconciledPolicy]);
    const logger = createMockLogger();

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), createMockScopedClient());
    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext({ fetchAllItems: secondList, update: secondUpdate }),
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    expect(secondUpdate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('already in sync on policy pp-1, skipping write')
    );
  });

  test('fetches the space package-policy set once for multiple enabled packs in the same space', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const secondPack = buildPackagePolicy('default--second-pack', 'pack-2');
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy(), secondPack]);

    const twoPacksFindResult = {
      saved_objects: [
        ...buildEnabledPackFindResult().saved_objects,
        {
          id: 'pack-2',
          namespaces: ['default'],
          references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
          attributes: {
            name: 'second-pack',
            enabled: true,
            queries: [
              { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-q1' },
            ],
          },
        },
      ],
      total: 2,
    };

    const { core } = createMockCoreStart(twoPacksFindResult, scopedClient);
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
    expect(packagePolicyList).toHaveBeenCalledTimes(1);
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(2);
  });

  test('skips a legacy-keyed pack whose wire block already matches the SO (no revision churn)', async () => {
    const reconciledPolicy = await buildInSyncPolicyFromFirstReconcile();
    const inSyncBlock =
      reconciledPolicy.inputs[0].config.osquery.value.packs['default--reconcile-pack'];
    const legacyInSyncPolicy = {
      ...reconciledPolicy,
      inputs: [
        {
          ...reconciledPolicy.inputs[0],
          config: {
            osquery: {
              value: {
                packs: { 'reconcile-pack': inSyncBlock },
              },
            },
          },
        },
      ],
    };

    const packagePolicyList = mockFetchAllItems([legacyInSyncPolicy]);
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), createMockScopedClient());
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
    expect(packagePolicyUpdate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('already in sync on policy pp-1, skipping write')
    );
  });

  test('preserves the wire-only `shard` field when it does write', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    // Stale schedule_id forces a write; `shard` must survive it.
    const stalePolicy = buildPackagePolicy();
    stalePolicy.inputs[0].config.osquery.value.packs['default--reconcile-pack'].shard = 42;
    const packagePolicyList = mockFetchAllItems([stalePolicy]);

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
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
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    // Bare-name pack matched via `policyHasPack`'s legacy fallback.
    const legacyPolicy = buildPackagePolicy('reconcile-pack');
    legacyPolicy.inputs[0].config.osquery.value.packs['reconcile-pack'].shard = 7;
    const packagePolicyList = mockFetchAllItems([legacyPolicy]);

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
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
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const osqueryContext = createMockOsqueryContext({
      fetchAllItems: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const run = () => {
      const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);

      return reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
      });
    };

    await run();
    const firstWire =
      packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];

    await run();
    const secondWire =
      packagePolicyUpdate.mock.calls[1][3].inputs[0].config.osquery.value.packs[
        'default--reconcile-pack'
      ];

    expect(secondWire.queries.q1.schedule_id).toBe(firstWire.queries.q1.schedule_id);
    expect(secondWire.queries.q2.schedule_id).toBe(firstWire.queries.q2.schedule_id);
    expect(secondWire.queries.q1.schedule_id).toBe('sched-q1');
  });

  test('skips disabled packs (only enabled packs reach the wire)', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const { core } = createMockCoreStart(
      buildEnabledPackFindResult({ enabled: false }),
      scopedClient
    );
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
    expect(packagePolicyUpdate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'reconcileScheduleIdsToWire: no enabled packs to reconcile'
    );
  });

  test('returns early when no packs exist', async () => {
    const { core } = createMockCoreStart({ saved_objects: [], total: 0 });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext: createMockOsqueryContext(),
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    expect(logger.debug).toHaveBeenCalledWith(
      'reconcileScheduleIdsToWire: no enabled packs to reconcile'
    );
  });

  test('flags hadFailures on version conflict (409) so the one-shot task re-arms', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Conflict'), { statusCode: 409 }));
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
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
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('version conflict for pack pack-1')
    );
  });

  test('classifies a Boom-shaped 409 (output.statusCode, no top-level statusCode) as a conflict', async () => {
    const scopedClient = createMockScopedClient();
    const boomConflict = Object.assign(new Error('Conflict'), {
      output: { statusCode: 409 },
    });
    const packagePolicyUpdate = jest.fn().mockRejectedValueOnce(boomConflict);
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
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
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('version conflict for pack pack-1')
    );
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('failed to reconcile pack pack-1')
    );
  });

  test('two stale packs sharing one policy converge in one pass (two updates, no self-inflicted 409)', async () => {
    const scopedClient = createMockScopedClient();

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

    // update echoes the written draft back with its id, mirroring Fleet's real return.
    const packagePolicyUpdate = jest
      .fn()
      .mockImplementation(async (_sc, _es, id, updated) => ({ ...updated, id }));
    const packagePolicyList = mockFetchAllItems([sharedPolicy]);

    const twoPacksFindResult = {
      saved_objects: [
        ...buildEnabledPackFindResult().saved_objects,
        {
          id: 'pack-2',
          namespaces: ['default'],
          references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
          attributes: {
            name: 'second-pack',
            enabled: true,
            queries: [
              { id: 'q1', query: 'SELECT 9', interval: 90, name: 'q1', schedule_id: 'sched-p2' },
            ],
          },
        },
      ],
      total: 2,
    };

    const { core } = createMockCoreStart(twoPacksFindResult, scopedClient);
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
    const secondWriteDraft = packagePolicyUpdate.mock.calls[1][3];
    const secondWritePacks = secondWriteDraft.inputs[0].config.osquery.value.packs;
    expect(secondWritePacks['default--reconcile-pack'].queries.q1.schedule_id).toBe('sched-q1');
    expect(secondWritePacks['default--second-pack'].queries.q1.schedule_id).toBe('sched-p2');
  });

  test('logs and flags hadFailures on non-conflict errors', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockRejectedValueOnce(new Error('something went wrong'));
    const packagePolicyList = mockFetchAllItems([buildPackagePolicy()]);

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
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
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to reconcile pack pack-1')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'reconcileScheduleIdsToWire: reconcile finished with partial failures, will retry'
    );
  });

  // The outer setup try/catch converts a pre-loop throw (client acquisition /
  // pack PIT paging / per-space policy drain) into a run result with
  // hadFailures rather than propagating: a thrown result becomes a Task Manager
  // FailedRunResult and the one-shot task is permanently removed after
  // maxAttempts. It must resolve to the normal run-result shape and log at error.
  test('setup failure (pack PIT finder throws) → resolves hadFailures, does NOT throw, logs error', async () => {
    const scopedClient = createMockScopedClient();
    const logger = createMockLogger();

    // Build a coreStart whose pack PIT finder throws from .find().
    const coreStart = {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({
          createPointInTimeFinder: jest.fn().mockReturnValue({
            close: jest.fn().mockResolvedValue(undefined),
            find: () => {
              throw new Error('pack PIT find failed');
            },
          }),
        }),
        getScopedClient: jest.fn().mockReturnValue(scopedClient),
      },
      http: {},
      elasticsearch: { client: { asInternalUser: {} } },
    } as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['coreStart'];

    const resultPromise = reconcileScheduleIdsToWire({
      coreStart,
      osqueryContext: createMockOsqueryContext(),
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    // Must resolve (not reject) with the retryable run-result shape.
    await expect(resultPromise).resolves.toEqual({ hadFailures: true });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('setup failed, will retry: pack PIT find failed')
    );
  });

  describe('pagination — multi-batch pack finder and multi-batch policy drain', () => {
    test('reconciles a pack that arrives on the SECOND pack-finder page', async () => {
      const scopedClient = createMockScopedClient();
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      // Two osquery policies, one per pack, drained in one fetchAllItems batch.
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy(),
        buildPackagePolicy('default--second-pack', 'pack-2'),
      ]);

      const firstPageSO = buildEnabledPackFindResult().saved_objects;
      const secondPageSO = [
        {
          id: 'pack-2',
          namespaces: ['default'],
          references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
          attributes: {
            name: 'second-pack',
            enabled: true,
            queries: [
              { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-p2' },
            ],
          },
        },
      ];

      // Two PIT pages: the second-page pack must still be reconciled.
      const { core } = createMockCoreStart(undefined, scopedClient, [firstPageSO, secondPageSO]);
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

    test('reconciles a pack whose target policy arrives on the SECOND fetchAllItems batch', async () => {
      const scopedClient = createMockScopedClient();
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      // The matching policy is only on page 2 of the policy drain.
      const unrelatedPolicy = buildPackagePolicy('default--unrelated', 'pack-x');
      const packagePolicyList = mockFetchAllItemsBatches([
        [unrelatedPolicy],
        [buildPackagePolicy()],
      ]);

      const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
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
      // The pack was found on the second policy batch and written.
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
      const packBlock =
        packagePolicyUpdate.mock.calls[0][3].inputs[0].config.osquery.value.packs[
          'default--reconcile-pack'
        ];
      expect(packBlock.queries.q1.schedule_id).toBe('sched-q1');
    });
  });

  describe('abort signal granularity', () => {
    test('stops mid-space when aborted before a later pack (per-pack check, not per-space)', async () => {
      const scopedClient = createMockScopedClient();
      // Abort fires after the first pack's write, before the second pack in the
      // SAME (default) space is processed.
      const abortController = new AbortController();
      const packagePolicyUpdate = jest.fn().mockImplementation(async () => {
        abortController.abort();

        return {};
      });

      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy(),
        buildPackagePolicy('default--second-pack', 'pack-2'),
      ]);

      const twoPacksFindResult = {
        saved_objects: [
          ...buildEnabledPackFindResult().saved_objects,
          {
            id: 'pack-2',
            namespaces: ['default'],
            references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
            attributes: {
              name: 'second-pack',
              enabled: true,
              queries: [
                { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1', schedule_id: 'sched-p2' },
              ],
            },
          },
        ],
        total: 2,
      };

      const { core } = createMockCoreStart(twoPacksFindResult, scopedClient);
      const osqueryContext = createMockOsqueryContext({
        fetchAllItems: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
        abortController,
      });

      expect(result).toEqual({ hadFailures: true });
      // Only the first pack wrote before the abort short-circuited the loop.
      expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('aborted by task manager, will retry remaining packs')
      );
    });
  });

  describe('isRruleFeatureEnabled flag — Fleet wire fields on reconcile', () => {
    const rruleValue = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };

    const buildRrulePackFindResult = () => ({
      saved_objects: [
        {
          id: 'pack-rrule',
          namespaces: ['default'],
          references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
          attributes: {
            name: 'rrule-pack',
            enabled: true,
            schedule_type: 'rrule',
            rrule_schedule: rruleValue,
            interval: null,
            queries: [{ id: 'q1', query: 'SELECT 1', name: 'q1', schedule_id: 'sched-q1' }],
          },
        },
      ],
      total: 1,
    });

    test('flag on + rrule-mode SO — wire carries default_rrule_schedule and schedule_id', async () => {
      const scopedClient = createMockScopedClient();
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy('default--rrule-pack', 'pack-rrule'),
      ]);

      const { core } = createMockCoreStart(buildRrulePackFindResult(), scopedClient);
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
      const scopedClient = createMockScopedClient();
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy('default--rrule-pack', 'pack-rrule'),
      ]);

      const { core } = createMockCoreStart(buildRrulePackFindResult(), scopedClient);
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
      const scopedClient = createMockScopedClient();
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy('default--legacy-pack', 'pack-legacy'),
      ]);

      const { core } = createMockCoreStart(
        {
          saved_objects: [
            {
              id: 'pack-legacy',
              namespaces: ['default'],
              references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
              attributes: {
                name: 'legacy-pack',
                enabled: true,
                queries: [
                  {
                    id: 'q1',
                    query: 'SELECT 1',
                    interval: 60,
                    name: 'q1',
                    schedule_id: 'sched-q1',
                  },
                ],
              },
            },
          ],
          total: 1,
        },
        scopedClient
      );

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
        { id: 'pack-legacy', type: 'osquery-pack', attributes: { queries: legacyQueries } } as any,

        {} as any
      ) as { attributes: { queries: Array<Record<string, unknown>> } };

      const migratedQueries = migrated.attributes.queries;
      migratedQueries.forEach((q) => expect(q.schedule_id).toMatch(UUID_REGEX));

      const scopedClient = createMockScopedClient();
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = mockFetchAllItems([
        buildPackagePolicy('default--legacy-pack', 'pack-legacy'),
      ]);

      const { core } = createMockCoreStart(
        {
          saved_objects: [
            {
              id: 'pack-legacy',
              namespaces: ['default'],
              references: [{ id: 'policy-1', name: 'policy-1', type: 'ingest-agent-policies' }],
              attributes: {
                name: 'legacy-pack',
                enabled: true,
                queries: migratedQueries,
              },
            },
          ],
          total: 1,
        },
        scopedClient
      );

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
