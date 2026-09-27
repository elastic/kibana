/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rule-event deduplication for non-aggregating ES|QL rules.
 *
 * The executor injects `METADATA _id, _index, _version` into non-aggregating
 * queries and derives a deterministic `.rule-events` `_id` from the source
 * document identity, so a source document that is re-matched on consecutive,
 * overlapping lookback windows produces exactly one rule event. This spec
 * drives the executor through several runs, including a disable/enable
 * cycle, and asserts the single-event invariant holds.
 *
 * We exclude `@kbn/eslint/scout_require_api_client_in_api_test` because the
 * subject is the executor's persisted output, not an HTTP endpoint.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, buildCreateRuleData, testData } from '../fixtures';

const { SCHEDULE_INTERVAL } = testData;

/**
 * Per-run unique index so documents left behind by an interrupted or
 * concurrent run can never satisfy this suite's exact-count assertions, and
 * teardown never deletes another run's index.
 */
const SOURCE_INDEX = `test-alerting-v2-rule-event-deduplication-${Date.now().toString(36)}`;

/**
 * Wide enough that the single source document stays inside the lookback for
 * the whole test. If it aged out, later runs would stop matching it and the
 * "only one event" assertion would pass without exercising deduplication.
 */
const LOOKBACK_WINDOW = '10m';

apiTest.describe('Rule executor - rule-event deduplication', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.sourceIndex.create({
      index: SOURCE_INDEX,
      mappings: {
        'host.name': { type: 'keyword' },
        'host.ip': { type: 'ip' },
        severity: { type: 'keyword' },
      },
    });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
  });

  apiTest(
    'writes a single rule event for one source document across runs and a disable/enable cycle',
    async ({ apiServices }) => {
      const host = 'host-dedup-toggle';

      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [{ '@timestamp': new Date().toISOString(), 'host.name': host, severity: 'high' }],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-dedup-disable-enable' },
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          query: {
            format: 'standalone',
            breach: { query: `FROM ${SOURCE_INDEX} | WHERE host.name == "${host}"` },
          },
        })
      );

      // The first run writes the breach. Each later run re-matches the same
      // document inside the overlapping lookback window; runs are 5s apart, so
      // the earlier event is already searchable and the `ids` pre-check in
      // FilterDuplicateEventsStep is what drops the re-match.
      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });
      await apiServices.alertingV2.ruleExecutions.waitForRuns({ ruleId: rule.id, runs: 2 });

      await apiServices.alertingV2.rules.disable(rule.id);
      await apiServices.alertingV2.rules.waitForEnabledState({ id: rule.id, enabled: false });
      await apiServices.alertingV2.ruleExecutions.waitForTaskDrained({ ruleId: rule.id });

      // Disabling removes the executor task and enabling schedules a new one, so
      // only the persisted deterministic `_id` can stop the document from being
      // written again.
      const reEnabledAt = new Date();
      await apiServices.alertingV2.rules.enable(rule.id);
      await apiServices.alertingV2.rules.waitForEnabledState({ id: rule.id, enabled: true });
      await apiServices.alertingV2.ruleExecutions.waitForRuns({
        ruleId: rule.id,
        runs: 2,
        since: reEnabledAt,
      });

      // Exactly one document for the rule overall: no duplicate breach, and no
      // recovered / no_data event either, which also proves the document was
      // still matching on every run rather than having left the lookback window.
      const events = await apiServices.alertingV2.ruleEvents.find(rule.id);
      expect(events).toHaveLength(1);

      const [event] = events;
      expect(event.status).toBe('breached');
      expect(event.data['host.name']).toBe(host);
      expect(typeof event.data._id).toBe('string');
      expect(event.data._index).toBe(SOURCE_INDEX);
      expect(typeof event.data._version).toBe('number');
      expect(event.episode?.status).toBe('active');
    }
  );

  apiTest(
    'writes a breach event on every run for an aggregating (STATS BY) query',
    async ({ apiServices }) => {
      const host = 'host-dedup-stats';

      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [{ '@timestamp': new Date().toISOString(), 'host.name': host, severity: 'high' }],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-dedup-stats-by' },
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          query: {
            format: 'standalone',
            breach: {
              query: `FROM ${SOURCE_INDEX} | WHERE host.name == "${host}" | STATS count = COUNT(*) BY host.name`,
            },
          },
        })
      );

      // Aggregated rows are not source documents, so no METADATA is injected
      // and no deterministic `_id` is derived. The same document therefore
      // produces a new breach event on every overlapping run, as it did
      // before deduplication existed.
      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 3, { status: 'breached' });

      const breachEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'breached',
      });
      expect(breachEvents.length).toBeGreaterThanOrEqual(3);

      const groupHashes = new Set(breachEvents.map((event) => event.group_hash));
      expect(groupHashes.size).toBe(1);

      for (const event of breachEvents) {
        expect(event.data.count).toBe(1);
        expect('_id' in event.data).toBe(false);
        expect('_index' in event.data).toBe(false);
        expect('_version' in event.data).toBe(false);
      }
    }
  );

  apiTest(
    'writes one event per MV_EXPAND row of a single source document and none again on re-match',
    async ({ apiServices }) => {
      const host = 'host-dedup-mv-expand';
      const ips = ['10.0.0.1', '10.0.0.2', '10.0.0.3'];

      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            'host.name': host,
            'host.ip': ips,
            severity: 'high',
          },
        ],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-dedup-mv-expand' },
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          grouping: { fields: ['host.ip'] },
          query: {
            format: 'standalone',
            breach: {
              query: `FROM ${SOURCE_INDEX} | WHERE host.name == "${host}" | MV_EXPAND host.ip`,
            },
          },
        })
      );

      // One document fans out into three rows that share `_id`, `_index` and
      // `_version`. The expanded `host.ip` value is folded into each row's
      // deterministic id, so all three persist on the first run, and later
      // runs re-matching the same document add nothing.
      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 3, { status: 'breached' });
      await apiServices.alertingV2.ruleExecutions.waitForRuns({ ruleId: rule.id, runs: 2 });

      const events = await apiServices.alertingV2.ruleEvents.find(rule.id);
      expect(events).toHaveLength(3);

      const expandedIps = events.map((event) => event.data['host.ip']).sort();
      expect(expandedIps).toStrictEqual(ips);

      const sourceIds = new Set(events.map((event) => event.data._id));
      expect(sourceIds.size).toBe(1);

      const episodeIds = new Set(events.map((event) => event.episode?.id));
      expect(episodeIds.size).toBe(3);

      for (const event of events) {
        expect(event.status).toBe('breached');
        expect(event.episode?.status).toBe('active');
      }
    }
  );
});
