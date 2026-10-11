/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../../../common/fixtures/constants';
import { FF_DUAL_PROCESS_ENABLED, FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common';
import type { EntityType } from '../../../../../common';
import {
  ENTITY_CONFIDENCE,
  USER_ENTITY_NAMESPACE,
} from '../../../../../common/domain/definitions/user_entity_constants';
import {
  clearEntityStoreIndices,
  forceLogExtraction,
  getStatus,
  installAllEntityTypes,
  LOGS_TEST_INDEX,
  setupLogsTestDataStream,
  startAllEntityTypes,
  stopAllEntityTypes,
  teardownLogsTestDataStream,
  uninstallAllEntityTypes,
  waitForStoreNotInstalled,
  type ApiClientFixture,
} from '../../../common/fixtures/helpers';
import {
  DUAL_PROCESS_WINDOW,
  RUN_ORDER_ACTIVITY,
  RUN_ORDER_ASSET,
  RUN_ORDER_USER_ID,
  RUN_ORDER_WINDOW,
  SAMPLING_ASSET_USERS,
  SAMPLING_LOCAL_USERS,
  SAMPLING_WINDOW,
  dualProcessCorpus,
  expectedDualProcessUserIds,
  runOrderCorpus,
  samplingCorpus,
  unexpectedDualProcessUserIds,
} from '../../../common/fixtures/dual_process_corpus';

type SettingsFn = (settings: Record<string, unknown>) => Promise<unknown>;
type Process = 'single' | 'priority' | 'nonPriority';
type EntitySet = Map<string, Record<string, unknown>>;

interface ExtractionSummary {
  success: boolean;
  count: number;
  error?: unknown;
}

/**
 * Sorts arrays of scalars so `collect_values` fields compare as sets. The order of
 * `MV_UNION` output depends on which run wrote first, and that is not a divergence.
 */
const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const items = value.map(normalize);
    return items.every((item) => typeof item !== 'object' || item === null)
      ? [...items].sort()
      : items;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        normalize(nested),
      ])
    );
  }
  return value;
};

const flatten = (value: unknown, prefix = ''): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { [prefix]: value };
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (acc, [key, nested]) => ({ ...acc, ...flatten(nested, prefix ? `${prefix}.${key}` : key) }),
    {}
  );
};

/** One line per missing entity, extra entity, or field whose value differs. */
const diffEntitySets = (expected: EntitySet, actual: EntitySet): string[] => {
  const diffs: string[] = [];
  for (const id of expected.keys()) {
    if (!actual.has(id)) diffs.push(`missing entity ${id}`);
  }
  for (const id of actual.keys()) {
    if (!expected.has(id)) diffs.push(`extra entity ${id}`);
  }
  for (const [id, expectedDoc] of expected) {
    const actualDoc = actual.get(id);
    if (!actualDoc) continue;
    const expectedFields = flatten(expectedDoc);
    const actualFields = flatten(actualDoc);
    const paths = new Set([...Object.keys(expectedFields), ...Object.keys(actualFields)]);
    for (const path of [...paths].sort()) {
      const want = JSON.stringify(expectedFields[path]);
      const got = JSON.stringify(actualFields[path]);
      if (want !== got) diffs.push(`${id} ${path}: single=${want} dual=${got}`);
    }
  }
  return diffs;
};

/** `entity.id` -> `namespace/confidence`. Both come from the EUID, so run order cannot move them. */
const levelsById = (entities: EntitySet): Record<string, string> =>
  Object.fromEntries(
    [...entities].map(([id, doc]) => {
      const { entity } = doc as { entity: { namespace?: string; confidence?: string } };
      return [id, `${entity.namespace}/${entity.confidence}`];
    })
  );

const countByLevel = (levels: Record<string, string>): Record<string, number> =>
  Object.values(levels).reduce<Record<string, number>>(
    (acc, level) => ({ ...acc, [level]: (acc[level] ?? 0) + 1 }),
    {}
  );

const readEntities = async (esClient: EsClient, type: EntityType): Promise<EntitySet> => {
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  const response = await esClient.search<Record<string, unknown>>({
    index: LATEST_ALIAS,
    query: { term: { 'entity.EngineMetadata.Type': type } },
    size: 1000,
  });
  return new Map(
    response.hits.hits.map((hit) => {
      // `@timestamp` is always the time of the last run, so it differs by construction.
      const { '@timestamp': _timestamp, ...source } = hit._source ?? {};
      const { entity } = source as { entity: { id: string } };
      return [entity.id, normalize(source) as Record<string, unknown>];
    })
  );
};

const countByIdPrefix = async (esClient: EsClient, prefix: string): Promise<number> => {
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  const response = await esClient.count({
    index: LATEST_ALIAS,
    query: { prefix: { 'entity.id': prefix } },
  });
  return response.count;
};

const bulkIndex = async (esClient: EsClient, docs: Array<Record<string, unknown>>) => {
  const response = await esClient.bulk({
    refresh: 'wait_for',
    operations: docs.flatMap((doc) => [{ create: { _index: LOGS_TEST_INDEX } }, doc]),
  });
  expect(response.errors).toBe(false);
};

apiTest.describe('Entity Store dual-process union equivalence', { tag: ENTITY_STORE_TAGS }, () => {
  let publicHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  // Built once by the single-process run and compared against by every dual-process one.
  let baseline: { users: EntitySet; hosts: EntitySet } | undefined;

  const setDualProcess = (apiServices: { core: { settings: SettingsFn } }, enabled: boolean) =>
    apiServices.core.settings({
      'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: enabled },
    });

  const userEngine = async (apiClient: ApiClientFixture) => {
    const status = await getStatus(apiClient, publicHeaders);
    expect(status.statusCode).toBe(200);
    const engine = status.body.engines.find((e) => e.type === 'user');
    expect(engine).toBeDefined();
    return engine!;
  };

  const expectProcessStatuses = async (
    apiClient: ApiClientFixture,
    priority: 'started' | 'stopped',
    // `undefined`: status reports no non-priority process, which is the case with the flag off.
    nonPriority: 'started' | 'stopped' | undefined
  ) => {
    const engine = await userEngine(apiClient);
    expect({ priority: engine.status, nonPriority: engine.nonPriority?.status }).toStrictEqual({
      priority,
      nonPriority,
    });
  };

  /** Installs every type and checks both user processes report the state the flag implies. */
  const install = async (apiClient: ApiClientFixture, dualProcess: boolean) => {
    expect((await installAllEntityTypes(apiClient, publicHeaders)).statusCode).toBe(201);
    await expectProcessStatuses(apiClient, 'started', dualProcess ? 'started' : undefined);
  };

  /** Uninstalls and checks no entity survives into the next scenario. */
  const uninstall = async (apiClient: ApiClientFixture, esClient: EsClient) => {
    expect((await uninstallAllEntityTypes(apiClient, publicHeaders)).statusCode).toBe(200);
    await waitForStoreNotInstalled(apiClient, publicHeaders);
    const remaining = await esClient.count(
      { index: LATEST_ALIAS, ignore_unavailable: true, allow_no_indices: true },
      { ignore: [404] }
    );
    expect(remaining.count ?? 0).toBe(0);
  };

  const setProcess = async (
    apiClient: ApiClientFixture,
    action: 'START' | 'STOP',
    process: 'priority' | 'nonPriority'
  ) => {
    const response = await apiClient.put(ENTITY_STORE_ROUTES.internal[action], {
      headers: internalHeaders,
      responseType: 'json',
      body: { entityTypes: ['user'], process },
    });
    expect(response.statusCode).toBe(200);
  };

  const setUserConfig = (apiClient: ApiClientFixture, body: Record<string, unknown>) =>
    apiClient.put(ENTITY_STORE_ROUTES.internal.ENGINE_CONFIG('user'), {
      headers: internalHeaders,
      responseType: 'json',
      body,
    });

  const extract = async (
    apiClient: ApiClientFixture,
    type: EntityType,
    process?: Process,
    window: { fromDateISO: string; toDateISO: string } = DUAL_PROCESS_WINDOW
  ): Promise<ExtractionSummary> => {
    const response = await forceLogExtraction(
      apiClient,
      internalHeaders,
      type,
      window.fromDateISO,
      window.toDateISO,
      process
    );
    expect(response.statusCode).toBe(200);
    const body = response.body as ExtractionSummary;
    expect(body).toMatchObject({ success: true });
    return body;
  };

  /**
   * Runs the corpus through single-process extraction with the flag off. Playwright restarts
   * the worker after a failure, so a later scenario rebuilds this instead of reading a value
   * an earlier test never set.
   */
  const getBaseline = async (
    apiClient: ApiClientFixture,
    apiServices: { core: { settings: SettingsFn } },
    esClient: EsClient
  ) => {
    if (baseline) return baseline;

    await setDualProcess(apiServices, false);
    await install(apiClient, false);

    // No `process` lets the server pick, and with the flag off that has to be `single`.
    await extract(apiClient, 'user');
    await extract(apiClient, 'host');
    baseline = {
      users: await readEntities(esClient, 'user'),
      hosts: await readEntities(esClient, 'host'),
    };

    await uninstall(apiClient, esClient);
    return baseline;
  };

  const expectUnionMatchesSingle = async (esClient: EsClient, expected: EntitySet) => {
    expect(diffEntitySets(expected, await readEntities(esClient, 'user'))).toStrictEqual([]);
  };

  /** Same entities at the same levels; field values are free to differ by run order. */
  const expectSameEntitiesAndLevels = async (esClient: EsClient, expected: EntitySet) => {
    const want = levelsById(expected);
    const got = levelsById(await readEntities(esClient, 'user'));
    expect(countByLevel(got)).toStrictEqual(countByLevel(want));
    expect(got).toStrictEqual(want);
  };

  apiTest.beforeAll(async ({ samlAuth, apiClient, esClient, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    publicHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
    internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

    // API-only runs never create the Security data view, see logs_extraction.spec.ts.
    const dataView = await apiClient.post('/api/data_views/data_view', {
      headers: publicHeaders,
      responseType: 'json',
      body: {
        override: true,
        data_view: {
          id: 'security-solution-default',
          name: 'security-solution-default',
          title: 'logs-*',
          timeFieldName: '@timestamp',
        },
      },
    });
    expect(dataView.statusCode).toBe(200);

    await uninstallAllEntityTypes(apiClient, publicHeaders).catch(() => {});
    await waitForStoreNotInstalled(apiClient, publicHeaders);

    await setupLogsTestDataStream(esClient);
    await bulkIndex(esClient, [...dualProcessCorpus, ...runOrderCorpus, ...samplingCorpus]);
  });

  apiTest.afterAll(async ({ apiClient, apiServices, esClient, kbnClient }) => {
    await uninstallAllEntityTypes(apiClient, publicHeaders).catch(() => {});
    await clearEntityStoreIndices(esClient);
    await teardownLogsTestDataStream(esClient);
    // `null` removes the override, see per_process_config.spec.ts.
    await apiServices.core.settings({
      'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: null },
    });
    await kbnClient.uiSettings.unset(FF_ENABLE_ENTITY_STORE_V2);
  });

  apiTest(
    'flag off: single-process extraction builds the baseline',
    async ({ apiClient, apiServices, esClient }) => {
      const { users } = await getBaseline(apiClient, apiServices, esClient);

      expect([...users.keys()].sort()).toStrictEqual([...expectedDualProcessUserIds].sort());
      for (const id of unexpectedDualProcessUserIds) {
        expect(users.has(id)).toBe(false);
      }
      expect(users.get('user:dp-local-asset@dp-host-3@local')).toMatchObject({
        entity: {
          confidence: ENTITY_CONFIDENCE.Medium,
          namespace: USER_ENTITY_NAMESPACE.Local,
        },
      });
    }
  );

  apiTest(
    'flag on: priority then non-priority matches single-process output',
    async ({ apiClient, apiServices, esClient }) => {
      const expected = await getBaseline(apiClient, apiServices, esClient);
      await setDualProcess(apiServices, true);
      await install(apiClient, true);

      await extract(apiClient, 'user', 'priority');
      await extract(apiClient, 'user', 'nonPriority');

      // No `process` on an ungated type still runs `single` with the flag on.
      await extract(apiClient, 'host');

      await expectUnionMatchesSingle(esClient, expected.users);
      expect(diffEntitySets(expected.hosts, await readEntities(esClient, 'host'))).toStrictEqual(
        []
      );

      await uninstall(apiClient, esClient);
    }
  );

  // Field values may differ in this order: non-priority drops IdP activity it reads before
  // priority created the user, and run order decides newest and oldest values. Both are accepted,
  // see https://github.com/elastic/kibana/issues/294434 and
  // https://github.com/elastic/kibana/issues/294432.
  apiTest(
    'flag on: non-priority then priority gives the same entities and levels as single-process',
    async ({ apiClient, apiServices, esClient }) => {
      const expected = await getBaseline(apiClient, apiServices, esClient);
      await setDualProcess(apiServices, true);
      await install(apiClient, true);

      await setProcess(apiClient, 'STOP', 'priority');
      await expectProcessStatuses(apiClient, 'stopped', 'started');
      await extract(apiClient, 'user', 'nonPriority');

      await setProcess(apiClient, 'START', 'priority');
      await expectProcessStatuses(apiClient, 'started', 'started');
      await extract(apiClient, 'user', 'priority');

      // Hosts have no gate, so run order cannot touch them.
      await extract(apiClient, 'host');

      await expectSameEntitiesAndLevels(esClient, expected.users);
      expect(diffEntitySets(expected.hosts, await readEntities(esClient, 'host'))).toStrictEqual(
        []
      );

      await uninstall(apiClient, esClient);
    }
  );

  apiTest(
    'flag on: public stop and start act on both processes',
    async ({ apiClient, apiServices, esClient }) => {
      const expected = await getBaseline(apiClient, apiServices, esClient);
      await setDualProcess(apiServices, true);
      await install(apiClient, true);

      expect((await stopAllEntityTypes(apiClient, publicHeaders)).statusCode).toBe(200);
      await expectProcessStatuses(apiClient, 'stopped', 'stopped');
      expect((await startAllEntityTypes(apiClient, publicHeaders)).statusCode).toBe(200);
      await expectProcessStatuses(apiClient, 'started', 'started');

      await extract(apiClient, 'user', 'priority');
      await extract(apiClient, 'user', 'nonPriority');
      await expectUnionMatchesSingle(esClient, expected.users);

      await uninstall(apiClient, esClient);
    }
  );

  // Across runs, `prefer_newest_value` and `prefer_oldest_value` keep the value of the last and
  // first run, not of the newest and oldest log. Priority then non-priority over an activity log
  // older than the asset log swaps this user's lifecycle and takes the older name. Accepted in
  // https://github.com/elastic/kibana/issues/294432; this pins it so a merge change shows up here.
  apiTest(
    'dual-process: run order decides newest and oldest values',
    async ({ apiClient, apiServices, esClient }) => {
      await setDualProcess(apiServices, false);
      await install(apiClient, false);
      await extract(apiClient, 'user', undefined, RUN_ORDER_WINDOW);
      expect((await readEntities(esClient, 'user')).get(RUN_ORDER_USER_ID)).toMatchObject({
        entity: {
          name: RUN_ORDER_ASSET.name,
          lifecycle: {
            first_seen: RUN_ORDER_ACTIVITY.timestamp,
            last_seen: RUN_ORDER_ASSET.timestamp,
          },
        },
        user: { name: RUN_ORDER_ASSET.name },
      });
      await uninstall(apiClient, esClient);

      await setDualProcess(apiServices, true);
      await install(apiClient, true);
      await extract(apiClient, 'user', 'priority', RUN_ORDER_WINDOW);
      await extract(apiClient, 'user', 'nonPriority', RUN_ORDER_WINDOW);
      expect((await readEntities(esClient, 'user')).get(RUN_ORDER_USER_ID)).toMatchObject({
        entity: {
          name: RUN_ORDER_ACTIVITY.name,
          lifecycle: {
            first_seen: RUN_ORDER_ASSET.timestamp,
            last_seen: RUN_ORDER_ACTIVITY.timestamp,
          },
        },
        user: { name: RUN_ORDER_ACTIVITY.name },
      });
      await uninstall(apiClient, esClient);
    }
  );

  apiTest(
    'flag on: a forced sampling rate samples non-priority only',
    async ({ apiClient, apiServices, esClient }) => {
      await setDualProcess(apiServices, true);
      await install(apiClient, true);

      expect(
        (await setUserConfig(apiClient, { nonPriorityOverride: { samplingRate: 0.09 } })).statusCode
      ).toBe(400);
      expect(
        (await setUserConfig(apiClient, { nonPriorityOverride: { samplingRate: 0.1 } })).statusCode
      ).toBe(200);
      expect((await userEngine(apiClient)).nonPriority?.samplingRate).toBe(0.1);

      await extract(apiClient, 'user', 'priority', SAMPLING_WINDOW);
      await extract(apiClient, 'user', 'nonPriority', SAMPLING_WINDOW);

      // Priority is never sampled.
      expect(await countByIdPrefix(esClient, 'user:dp-sample-okta-')).toBe(SAMPLING_ASSET_USERS);

      // SAMPLE is random. At 0.1 over 1000 single-doc users the count averages 100 with a
      // standard deviation near 9.5, so these bounds sit more than 7 deviations out.
      const sampled = await countByIdPrefix(esClient, 'user:dp-sample-local-');
      expect(sampled).toBeGreaterThanOrEqual(30);
      expect(sampled).toBeLessThanOrEqual(250);
      expect(sampled).toBeLessThan(SAMPLING_LOCAL_USERS);

      expect(
        (await setUserConfig(apiClient, { nonPriorityOverride: { samplingRate: null } })).statusCode
      ).toBe(200);
      expect((await userEngine(apiClient)).nonPriority?.samplingRate).toBeNull();

      await uninstall(apiClient, esClient);
    }
  );
});
