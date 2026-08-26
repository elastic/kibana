/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Simulates the divergence at the heart of #283590 / #273425 across two consecutive rule
 * executions: run 1 persists an active alert to AAD and then "throws" before Task Manager
 * saves the new task state (get_state.ts returns the previous, empty state on any error), so
 * run 2 starts with task state that has no memory of it. Asserts that reconciliation
 * (get_tracked_alerts.ts + AlertsClient.initializeExecution) closes the orphaned document
 * instead of leaving it stuck active forever, and that a genuinely new occurrence gets its
 * own document.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import type { UntypedNormalizedRuleType } from '../rule_type_registry';
import { DEFAULT_FLAPPING_SETTINGS, RecoveredActionGroup } from '../types';
import { AlertsClient } from './alerts_client';
import type { AlertsClientParams } from './alerts_client';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { maintenanceWindowsServiceMock } from '../task_runner/maintenance_windows/maintenance_windows_service.mock';
import { getDataStreamAdapter } from '../alerts_service/lib/data_stream_adapter';
import type { KibanaRequest } from '@kbn/core/server';
import { alertRuleData } from './alerts_client_fixtures';

const ALIAS = '.alerts-test.alerts-default';

interface FakeDoc {
  _index: string;
  _source: Record<string, unknown>;
  _seq_no: number;
  _primary_term: number;
}

// A minimal in-memory stand-in for the AAD index, shared by both simulated rule runs, so we
// can assert on the end-to-end result of reconciliation rather than individual ES calls.
const createFakeAlertsIndex = () => {
  const store = new Map<string, FakeDoc>();

  const matches = (doc: FakeDoc, ruleId: string) => doc._source[ALERT_RULE_UUID] === ruleId;

  const toHit = (uuid: string, doc: FakeDoc) => ({
    _id: uuid,
    _index: doc._index,
    _seq_no: doc._seq_no,
    _primary_term: doc._primary_term,
    _source: doc._source,
  });

  const search: ElasticsearchClient['search'] = (async (request: Record<string, unknown>) => {
    const query = request.query as { bool: { must?: unknown[]; filter?: unknown[] } };
    const bool = query.bool;
    const must = bool.must ?? [];
    const filter = bool.filter ?? [];

    const ruleIdTerm = (must as Array<Record<string, unknown>>).find((c) => 'term' in c);
    const ruleId = ruleIdTerm
      ? Object.values((ruleIdTerm as { term: Record<string, { value: string }> }).term)[0].value
      : undefined;

    if (request.collapse) {
      // execution-uuid collapse query
      return {
        hits: {
          total: { value: 0, relation: 'eq' as const },
          hits: [],
        },
      };
    }

    const idsFilter = (filter as Array<Record<string, unknown>>).find((c) => 'ids' in c) as
      | { ids: { values: string[] } }
      | undefined;

    if (idsFilter) {
      const hits = idsFilter.ids.values
        .filter((uuid) => store.has(uuid))
        .map((uuid) => toHit(uuid, store.get(uuid)!));
      return { hits: { total: { value: hits.length, relation: 'eq' as const }, hits } };
    }

    const statusTerms = (must as Array<Record<string, unknown>>).find((c) => 'terms' in c) as
      | { terms: Record<string, string[]> }
      | undefined;

    if (statusTerms) {
      const allowedStatuses = Object.values(statusTerms.terms)[0];
      const hits = [...store.entries()]
        .filter(
          ([, doc]) =>
            (!ruleId || matches(doc, ruleId)) &&
            allowedStatuses.includes(doc._source[ALERT_STATUS] as string)
        )
        .map(([uuid, doc]) => toHit(uuid, doc));
      return { hits: { total: { value: hits.length, relation: 'eq' as const }, hits } };
    }

    // execution-filtered fetch (no matching execution uuids in this simulation)
    return { hits: { total: { value: 0, relation: 'eq' as const }, hits: [] } };
  }) as never;

  const bulk: ElasticsearchClient['bulk'] = (async (request: Record<string, unknown>) => {
    const body = request.body as Array<Record<string, unknown>>;
    for (let i = 0; i < body.length; i++) {
      const op = body[i];
      if (op.create) {
        const { _id } = op.create as { _id: string };
        const doc = body[++i] as Record<string, unknown>;
        store.set(_id, { _index: ALIAS, _source: doc, _seq_no: 1, _primary_term: 1 });
      } else if (op.index) {
        const { _id, _index } = op.index as { _id: string; _index: string };
        const doc = body[++i] as Record<string, unknown>;
        const existing = store.get(_id);
        store.set(_id, {
          _index,
          _source: doc,
          _seq_no: (existing?._seq_no ?? 0) + 1,
          _primary_term: existing?._primary_term ?? 1,
        });
      } else if (op.delete) {
        const { _id } = op.delete as { _id: string };
        store.delete(_id);
      }
    }
    return { errors: false, items: [] };
  }) as never;

  const updateByQuery: ElasticsearchClient['updateByQuery'] = (async (
    request: Record<string, unknown>
  ) => {
    const query = request.query as { bool: { filter?: Array<Record<string, unknown>> } };
    const idsFilter = query.bool.filter?.find((c) => 'ids' in c) as
      | { ids: { values: string[] } }
      | undefined;
    const uuids = idsFilter?.ids.values ?? [];
    const now = new Date().toISOString();
    let updated = 0;
    for (const uuid of uuids) {
      const doc = store.get(uuid);
      if (doc) {
        doc._source = {
          ...doc._source,
          [ALERT_STATUS]: ALERT_STATUS_UNTRACKED,
          [ALERT_END]: now,
        };
        updated++;
      }
    }
    return { updated, total: uuids.length } as never;
  }) as never;

  return { store, search, bulk, updateByQuery };
};

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test.rule-type',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  solution: 'stack',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  autoRecoverAlerts: true,
  doesSetRecoveryContext: true,
  validate: {
    params: { validate: (params: unknown) => params },
  },
  alerts: {
    context: 'test',
    mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    shouldWrite: true,
  },
  validLegacyConsumers: [],
} as unknown as jest.Mocked<UntypedNormalizedRuleType>;

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: { href: '/' },
  raw: { req: { url: '/' } },
  getSavedObjectsClient: jest.fn(),
} as unknown as KibanaRequest;

describe('orphan reconciliation across executions', () => {
  it('untracks a document orphaned by a persist-then-throw run, leaving exactly one active document for the next occurrence', async () => {
    const fakeIndex = createFakeAlertsIndex();
    const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    clusterClient.search.mockImplementation(fakeIndex.search);
    clusterClient.bulk.mockImplementation(fakeIndex.bulk);
    clusterClient.updateByQuery.mockImplementation(fakeIndex.updateByQuery);

    const maintenanceWindowsService = maintenanceWindowsServiceMock.create();
    maintenanceWindowsService.getMaintenanceWindows.mockReturnValue({
      maintenanceWindows: [],
      maintenanceWindowsWithoutScopedQueryIds: [],
    });

    const baseParams: AlertsClientParams = {
      alertingEventLogger: alertingEventLoggerMock.create(),
      logger: loggingSystemMock.createLogger(),
      elasticsearchClientPromise: Promise.resolve(clusterClient),
      request: fakeRequest,
      ruleType,
      maintenanceWindowsService,
      namespace: 'default',
      rule: alertRuleData,
      kibanaVersion: '8.9.0',
      spaceId: 'default',
      isServerless: false,
      dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
    };

    const runRule = async ({
      activeAlertsFromState,
      reportInstanceId,
    }: {
      activeAlertsFromState: Parameters<
        AlertsClient<{}, {}, {}, 'default', 'recovered'>['initializeExecution']
      >[0]['activeAlertsFromState'];
      reportInstanceId?: string;
    }) => {
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(baseParams);
      await alertsClient.initializeExecution({
        maxAlerts: 1000,
        ruleLabel: 'test: rule-name',
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState,
        recoveredAlertsFromState: {},
        startedAt: null,
      });

      if (reportInstanceId) {
        alertsClient.factory().create(reportInstanceId).scheduleActions('default');
      }

      await alertsClient.processAlerts();
      alertsClient.determineFlappingAlerts();
      alertsClient.determineDelayedAlerts({
        ruleRunMetricsStore: ruleRunMetricsStoreMock.create(),
        alertDelay: 0,
      });
      alertsClient.logAlerts({
        shouldLogAlerts: false,
        ruleRunMetricsStore: ruleRunMetricsStoreMock.create(),
      });
      await alertsClient.persistAlerts();

      return alertsClient.getRawAlertInstancesForState();
    };

    // Run 1: alert '1' fires and is persisted to AAD, then the run "throws" before Task
    // Manager saves the new state - simulated by simply not feeding this run's output into
    // run 2's activeAlertsFromState below.
    const run1 = await runRule({ activeAlertsFromState: {}, reportInstanceId: '1' });
    const orphanedUuid = run1.rawActiveAlerts['1'].meta!.uuid!;

    expect(fakeIndex.store.get(orphanedUuid)?._source[ALERT_STATUS]).toBe('active');

    // Run 2: task state was rewound to empty (as if the previous run's error meant Task
    // Manager never saw the new state), and a different instance fires this time.
    const run2 = await runRule({ activeAlertsFromState: {}, reportInstanceId: '2' });
    const newUuid = run2.rawActiveAlerts['2'].meta!.uuid!;

    // The orphan is untracked with an end, not left stuck active.
    expect(fakeIndex.store.get(orphanedUuid)?._source[ALERT_STATUS]).toBe(ALERT_STATUS_UNTRACKED);
    expect(fakeIndex.store.get(orphanedUuid)?._source[ALERT_END]).toBeDefined();

    // The new occurrence got its own document.
    expect(fakeIndex.store.get(newUuid)?._source[ALERT_STATUS]).toBe('active');
    expect(fakeIndex.store.get(newUuid)?._source[ALERT_INSTANCE_ID]).toBe('2');

    // Exactly one active document remains for the rule.
    const activeDocs = [...fakeIndex.store.values()].filter(
      (doc) => doc._source[ALERT_STATUS] === 'active'
    );
    expect(activeDocs).toHaveLength(1);
  });
});
