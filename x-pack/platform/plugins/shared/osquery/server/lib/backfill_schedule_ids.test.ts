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
import { reconcileScheduleIdsToWire } from './backfill_schedule_ids';
import { packSavedObjectModelVersion4 } from './saved_query/saved_object_model_versions';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const createMockCoreStart = (
  findResult: unknown = { saved_objects: [], total: 0 },
  scopedClient?: ReturnType<typeof createMockScopedClient>
) => {
  const sc = scopedClient ?? createMockScopedClient();

  return {
    core: {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue(findResult),
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

const createMockOsqueryContext = (packagePolicyService?: unknown) =>
  ({
    getPackagePolicyService: jest.fn().mockReturnValue(
      packagePolicyService ?? {
        list: jest.fn().mockResolvedValue({ items: [] }),
        update: jest.fn().mockResolvedValue({}),
      }
    ),
  } as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['osqueryContext']);

// A pack SO that already carries `schedule_id` on every query (the post-V4
// guarantee). The reconciler reads these as the source of truth and projects
// them onto the wire — it never mints.
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
    const packagePolicyList = jest.fn().mockResolvedValue({ items: [buildPackagePolicy()] });

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
    const osqueryContext = createMockOsqueryContext({
      list: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    expect(result).toEqual({ hadFailures: false });
    // The reconciler must NEVER write the pack SO — minting is owned by the
    // model version. Only the Fleet package policy is updated.
    expect(scopedClient.update).not.toHaveBeenCalled();
    expect(packagePolicyUpdate).toHaveBeenCalledTimes(1);
  });

  test('projects the SO schedule_id onto the Fleet wire', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = jest.fn().mockResolvedValue({ items: [buildPackagePolicy()] });

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
    const osqueryContext = createMockOsqueryContext({
      list: packagePolicyList,
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
    // pack_id is set from the SO id.
    expect(packBlock.pack_id).toBe('pack-1');
  });

  test('is idempotent — a second run changes no schedule_id', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = jest.fn().mockResolvedValue({ items: [buildPackagePolicy()] });

    const osqueryContext = createMockOsqueryContext({
      list: packagePolicyList,
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

    // Same source-of-truth SO → byte-identical wire, no uuid drift.
    expect(secondWire.queries.q1.schedule_id).toBe(firstWire.queries.q1.schedule_id);
    expect(secondWire.queries.q2.schedule_id).toBe(firstWire.queries.q2.schedule_id);
    expect(secondWire.queries.q1.schedule_id).toBe('sched-q1');
  });

  test('skips disabled packs (only enabled packs reach the wire)', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockResolvedValue({});
    const packagePolicyList = jest.fn().mockResolvedValue({ items: [buildPackagePolicy()] });

    const { core } = createMockCoreStart(
      buildEnabledPackFindResult({ enabled: false }),
      scopedClient
    );
    const osqueryContext = createMockOsqueryContext({
      list: packagePolicyList,
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

  test('continues on version conflict (409)', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Conflict'), { statusCode: 409 }));
    const packagePolicyList = jest.fn().mockResolvedValue({ items: [buildPackagePolicy()] });

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
    const osqueryContext = createMockOsqueryContext({
      list: packagePolicyList,
      update: packagePolicyUpdate,
    });
    const logger = createMockLogger();

    const result = await reconcileScheduleIdsToWire({
      coreStart: core,
      osqueryContext,
      logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
    });

    // A 409 is benign churn, not a failure that should force a retry.
    expect(result).toEqual({ hadFailures: false });
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('version conflict for pack pack-1')
    );
  });

  test('logs and flags hadFailures on non-conflict errors', async () => {
    const scopedClient = createMockScopedClient();
    const packagePolicyUpdate = jest.fn().mockRejectedValueOnce(new Error('something went wrong'));
    const packagePolicyList = jest.fn().mockResolvedValue({ items: [buildPackagePolicy()] });

    const { core } = createMockCoreStart(buildEnabledPackFindResult(), scopedClient);
    const osqueryContext = createMockOsqueryContext({
      list: packagePolicyList,
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
      const packagePolicyList = jest
        .fn()
        .mockResolvedValue({ items: [buildPackagePolicy('default--rrule-pack', 'pack-rrule')] });

      const { core } = createMockCoreStart(buildRrulePackFindResult(), scopedClient);
      const osqueryContext = createMockOsqueryContext({
        list: packagePolicyList,
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
      const packagePolicyList = jest
        .fn()
        .mockResolvedValue({ items: [buildPackagePolicy('default--rrule-pack', 'pack-rrule')] });

      const { core } = createMockCoreStart(buildRrulePackFindResult(), scopedClient);
      const osqueryContext = createMockOsqueryContext({
        list: packagePolicyList,
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
      const packagePolicyList = jest
        .fn()
        .mockResolvedValue({ items: [buildPackagePolicy('default--legacy-pack', 'pack-legacy')] });

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
        list: packagePolicyList,
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

  describe('integration — legacy SO → model version V4 → reconciler → Fleet wire', () => {
    // End-to-end sanity (FTR-style, in-process): a legacy pack whose queries
    // have NO schedule_id is migrated by the real V4 `data_backfill`, then the
    // reconciler projects the now-minted schedule_id values onto the Fleet
    // package-policy wire. Asserts the full pipeline delivers schedule_id per
    // query without the reconciler minting anything.
    const backfillFn = (
      packSavedObjectModelVersion4.changes.find(
        (change): change is SavedObjectsModelDataBackfillChange => change.type === 'data_backfill'
      ) as SavedObjectsModelDataBackfillChange
    ).backfillFn as SavedObjectModelDataBackfillFn<
      { queries?: Array<Record<string, unknown>> },
      { queries?: Array<Record<string, unknown>> }
    >;

    test('legacy queries gain schedule_id via V4, and the reconciler carries them to the wire', async () => {
      // 1) Legacy SO: queries with no schedule_id.
      const legacyQueries = [
        { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1' },
        { id: 'q2', query: 'SELECT 2', interval: 120, name: 'q2' },
      ];

      // 2) Run the REAL model-version backfill.
      const migrated = backfillFn(
        { id: 'pack-legacy', type: 'osquery-pack', attributes: { queries: legacyQueries } } as any,

        {} as any
      ) as { attributes: { queries: Array<Record<string, unknown>> } };

      const migratedQueries = migrated.attributes.queries;
      migratedQueries.forEach((q) => expect(q.schedule_id).toMatch(UUID_REGEX));

      // 3) Feed the migrated SO into the reconciler.
      const scopedClient = createMockScopedClient();
      const packagePolicyUpdate = jest.fn().mockResolvedValue({});
      const packagePolicyList = jest
        .fn()
        .mockResolvedValue({ items: [buildPackagePolicy('default--legacy-pack', 'pack-legacy')] });

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
        list: packagePolicyList,
        update: packagePolicyUpdate,
      });
      const logger = createMockLogger();

      const result = await reconcileScheduleIdsToWire({
        coreStart: core,
        osqueryContext,
        logger: logger as unknown as Parameters<typeof reconcileScheduleIdsToWire>[0]['logger'],
      });

      // 4) The reconciler minted nothing and the wire carries each schedule_id.
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
