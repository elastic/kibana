/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as wait } from 'timers/promises';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, buildCreateRuleData, testData } from '../fixtures';

const { LOOKBACK_WINDOW, SCHEDULE_INTERVAL } = testData;

/**
 * Isolated cases for the alerting_v2 rule executor's persisted output.
 *
 * The executor pipeline runs:
 *   WaitForResources -> FetchRule -> ValidateRule -> ExecuteRuleQuery
 *     -> CreateAlertEvents -> CreateRecoveryEvents -> DirectorStep -> StoreAlertEvents
 *
 * These tests assert on fields the executor itself controls
 * (`rule.id`, `rule.version`, `group_hash`, `data`, `status`, `source`, `@timestamp`,
 * `scheduled_timestamp`) and intentionally ignore `episode.*`. Episode lifecycle /
 * state-machine concerns belong to the director step and live in their own spec.
 *
 * All rules use `kind: 'alert'` (the default), so persisted events carry
 * `type: 'alert'` after director processing.
 */
apiTest.describe('Rule executor', { tag: tags.stateful.classic }, () => {
  const SOURCE_INDEX = 'test-alerting-v2-rule-executor-source';
  /**
   * Time we let the executor run between assertions when verifying that no new
   * events are produced (e.g. disabled / deleted / no-match rules). At least one
   * task manager tick (~3-5s) plus margin so a slow tick still fires.
   */
  const WAIT_TIME_MS = 12_000;

  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.sourceIndex.create({
      index: SOURCE_INDEX,
      mappings: {
        'host.name': { type: 'keyword' },
        severity: { type: 'keyword' },
        value: { type: 'long' },
      },
    });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
  });

  apiTest('writes one breach event per matching ES|QL row', async ({ apiServices }) => {
    await apiServices.alertingV2.sourceIndex.indexDocs({
      index: SOURCE_INDEX,
      docs: [
        {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-shape-single',
          severity: 'high',
          value: 1,
        },
      ],
    });

    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: 'executor-shape-single-row' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-shape-single" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
          },
        },
        recovery_policy: { type: 'no_breach' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );

    await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

    const breachEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
      status: 'breached',
    });
    expect(breachEvents).toHaveLength(1);
    expect(breachEvents[0].data).toMatchObject({ 'host.name': 'host-shape-single' });
  });

  apiTest(
    'populates rule, source, and scheduling fields on every breach event',
    async ({ apiServices }) => {
      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-shape-fields',
            severity: 'high',
            value: 1,
          },
        ],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-shape-rule-fields' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-shape-fields" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

      const [event] = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'breached',
      });

      expect(event.rule.id).toBe(rule.id);
      expect(Number.isInteger(event.rule.version)).toBe(true);
      expect(event.rule.version).toBeGreaterThan(0);

      expect(event.source).toBe('internal');

      expect(typeof event['@timestamp']).toBe('string');
      expect(typeof event.scheduled_timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(event['@timestamp']))).toBe(false);
      expect(Number.isNaN(Date.parse(event.scheduled_timestamp!))).toBe(false);
      expect(Date.parse(event.scheduled_timestamp!)).toBeLessThanOrEqual(
        Date.parse(event['@timestamp'])
      );

      expect(typeof event.group_hash).toBe('string');
      expect(event.group_hash.length).toBeGreaterThan(0);
    }
  );

  apiTest('writes one event per group when grouping.fields is set', async ({ apiServices }) => {
    await apiServices.alertingV2.sourceIndex.indexDocs({
      index: SOURCE_INDEX,
      docs: [
        {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-grouping-a',
          severity: 'high',
          value: 1,
        },
        {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-grouping-b',
          severity: 'high',
          value: 1,
        },
      ],
    });

    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: 'executor-grouping-one-per-group' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: `FROM ${SOURCE_INDEX} | WHERE host.name IN ("host-grouping-a", "host-grouping-b") | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
          },
        },
        recovery_policy: { type: 'no_breach' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );

    await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 2, { status: 'breached' });

    const breachEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
      status: 'breached',
    });
    expect(breachEvents).toHaveLength(2);

    const groupHashes = new Set(breachEvents.map((e) => e.group_hash));
    expect(groupHashes.size).toBe(2);

    const hosts = breachEvents.map((e) => e.data['host.name']).sort();
    expect(hosts).toStrictEqual(['host-grouping-a', 'host-grouping-b']);
  });

  apiTest(
    'produces stable group_hash for the same group across executions',
    async ({ apiServices }) => {
      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-grouping-stable',
            severity: 'high',
            value: 1,
          },
        ],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-grouping-stable-hash' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-grouping-stable" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

      const firstHash = (await apiServices.alertingV2.ruleEvents.find(rule.id))[0].group_hash;

      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-grouping-stable',
            severity: 'high',
            value: 2,
          },
        ],
      });

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 2, { status: 'breached' });

      const breachEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'breached',
      });
      expect(breachEvents).toHaveLength(2);
      expect(breachEvents[0].group_hash).toBe(firstHash);
      expect(breachEvents[1].group_hash).toBe(firstHash);
    }
  );

  apiTest(
    'produces a single breach event with a non-empty group_hash when grouping is omitted',
    async ({ apiServices }) => {
      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-grouping-fallback-a',
            severity: 'high',
            value: 1,
          },
          {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-grouping-fallback-b',
            severity: 'high',
            value: 1,
          },
        ],
      });

      // Aggregating without BY collapses both rows into a single ES|QL row, so the
      // executor sees one breach (validating the SHA-256 fallback path).
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-grouping-fallback' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name IN ("host-grouping-fallback-a", "host-grouping-fallback-b") | STATS count = COUNT(*) | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

      const breachEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'breached',
      });
      expect(breachEvents).toHaveLength(1);
      expect(breachEvents[0].group_hash).toMatch(/^[0-9a-f]{64}$/);
    }
  );

  apiTest(
    'includes data within the lookback window even when older than schedule.every',
    async ({ apiServices }) => {
      // 30s in the past — within the 1m lookback but well outside the 5s schedule
      // interval, so it can only be picked up by the lookback range.
      const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();

      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': thirtySecondsAgo,
            'host.name': 'host-lookback-included',
            severity: 'high',
            value: 1,
          },
        ],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-lookback-included' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-lookback-included" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

      const breachEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'breached',
      });
      expect(breachEvents.length).toBeGreaterThanOrEqual(1);
      expect(breachEvents[0].data).toMatchObject({ 'host.name': 'host-lookback-included' });
    }
  );

  apiTest('excludes data outside the lookback window', async ({ apiServices }) => {
    // 5 minutes in the past — well outside the 1m lookback.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();

    await apiServices.alertingV2.sourceIndex.indexDocs({
      index: SOURCE_INDEX,
      docs: [
        {
          '@timestamp': fiveMinutesAgo,
          'host.name': 'host-lookback-excluded',
          severity: 'high',
          value: 1,
        },
      ],
    });

    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: 'executor-lookback-excluded' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-lookback-excluded" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
          },
        },
        recovery_policy: { type: 'no_breach' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );

    await wait(WAIT_TIME_MS);

    const events = await apiServices.alertingV2.ruleEvents.find(rule.id);
    expect(events).toHaveLength(0);
  });

  apiTest(
    'emits a recovered event under no_breach policy when a previously breaching group stops breaching',
    async ({ apiServices, esClient }) => {
      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-recovery-no-breach',
            severity: 'high',
            value: 1,
          },
        ],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-recovery-no-breach' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-recovery-no-breach" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

      const breachedEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'breached',
      });
      const breachedHash = breachedEvents[0].group_hash;

      await esClient.deleteByQuery({
        index: SOURCE_INDEX,
        query: { term: { 'host.name': 'host-recovery-no-breach' } },
        refresh: true,
        wait_for_completion: true,
      });

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'recovered' });

      const recoveredEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'recovered',
      });
      expect(recoveredEvents.length).toBeGreaterThanOrEqual(1);
      expect(recoveredEvents[0].group_hash).toBe(breachedHash);
    }
  );

  apiTest(
    'uses the configured query under recovery_policy.type=query',
    async ({ apiServices, esClient }) => {
      // severity=high docs drive the main breach query; severity=recovered docs
      // drive the recovery query for the SAME group (host.name).
      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-recovery-query',
            severity: 'high',
            value: 1,
          },
        ],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'executor-recovery-query' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-recovery-query" AND severity == "high" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: {
            type: 'query',
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-recovery-query" AND severity == "recovered" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          grouping: { fields: ['host.name'] },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

      const breachedEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'breached',
      });
      const breachedHash = breachedEvents[0].group_hash;

      // Drop the breaching doc so the main query no longer matches, then
      // index a doc that matches the recovery query for the same host.
      await esClient.deleteByQuery({
        index: SOURCE_INDEX,
        query: {
          bool: {
            filter: [
              { term: { 'host.name': 'host-recovery-query' } },
              { term: { severity: 'high' } },
            ],
          },
        },
        refresh: true,
        wait_for_completion: true,
      });

      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-recovery-query',
            severity: 'recovered',
            value: 0,
          },
        ],
      });

      await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'recovered' });

      const recoveredEvents = await apiServices.alertingV2.ruleEvents.find(rule.id, {
        status: 'recovered',
      });
      expect(recoveredEvents.length).toBeGreaterThanOrEqual(1);
      expect(recoveredEvents[0].group_hash).toBe(breachedHash);
    }
  );

  apiTest('writes zero events when the ES|QL query returns no rows', async ({ apiServices }) => {
    // No source docs match the unique host filter.
    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: 'executor-no-breach-empty-query' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-no-breach-never-indexed" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
          },
        },
        recovery_policy: { type: 'no_breach' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );

    await wait(WAIT_TIME_MS);

    const events = await apiServices.alertingV2.ruleEvents.find(rule.id);
    expect(events).toHaveLength(0);
  });

  apiTest('a disabled rule writes no new events', async ({ apiServices }) => {
    await apiServices.alertingV2.sourceIndex.indexDocs({
      index: SOURCE_INDEX,
      docs: [
        {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-halt-disabled',
          severity: 'high',
          value: 1,
        },
      ],
    });

    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: 'executor-halt-disabled' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-halt-disabled" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
          },
        },
        recovery_policy: { type: 'no_breach' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );

    await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

    await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });

    // Let any in-flight execution drain so the snapshot is stable.
    await wait(WAIT_TIME_MS);
    const baseline = (await apiServices.alertingV2.ruleEvents.find(rule.id)).length;

    await wait(WAIT_TIME_MS);
    const after = (await apiServices.alertingV2.ruleEvents.find(rule.id)).length;

    expect(after).toBe(baseline);
  });

  apiTest('a deleted rule writes no new events', async ({ apiServices }) => {
    await apiServices.alertingV2.sourceIndex.indexDocs({
      index: SOURCE_INDEX,
      docs: [
        {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-halt-deleted',
          severity: 'high',
          value: 1,
        },
      ],
    });

    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: 'executor-halt-deleted' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-halt-deleted" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
          },
        },
        recovery_policy: { type: 'no_breach' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );

    await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, { status: 'breached' });

    await apiServices.alertingV2.rules.delete(rule.id);

    // Let any in-flight execution drain so the snapshot is stable.
    await wait(WAIT_TIME_MS);
    const baseline = (await apiServices.alertingV2.ruleEvents.find(rule.id)).length;

    await wait(WAIT_TIME_MS);
    const after = (await apiServices.alertingV2.ruleEvents.find(rule.id)).length;

    expect(after).toBe(baseline);
  });

  apiTest('an invalid ES|QL query writes no events', async ({ apiServices }) => {
    // Targets an index that does not exist. The ES|QL parser accepts the query
    // (so rule creation succeeds) but execution fails at runtime; the executor
    // surfaces the failure through error middleware and writes nothing.
    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: 'executor-invalid-query' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: 'FROM nonexistent-index-rule-executor-spec-zzz | STATS count = COUNT(*) | WHERE count >= 1',
          },
        },
        recovery_policy: { type: 'no_breach' },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );

    await wait(WAIT_TIME_MS);

    const events = await apiServices.alertingV2.ruleEvents.find(rule.id);
    expect(events).toHaveLength(0);
  });
});
