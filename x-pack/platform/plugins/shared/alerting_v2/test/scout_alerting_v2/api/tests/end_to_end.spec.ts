/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * End-to-end smoke tests for the alerting_v2 end-to-end.
 *
 * These tests prove the executor → director → dispatcher chain is wired
 * together by creating a real rule against a real source index and asserting
 * that a `fire` action lands in `.alert-actions`. Detailed end-to-end behaviors
 * (suppression, throttle, matchers, maintenance windows, ...) are covered by
 * `dispatcher.spec.ts` using seeded events. The `director.spec.ts` test files covers the
 * director's annotation surface in `.rule-events`. This spec intentionally
 * keeps its surface small and its assertions broad. The value is in catching
 * regressions that break the three components' interplay.
 *
 * We exclude `@kbn/eslint/scout_require_api_client_in_api_test` because this
 * spec does not target an HTTP endpoint. It drives the alerting_v2 background
 * tasks via source data and observes the action data stream.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, buildCreateRuleData, testData } from '../fixtures';

const { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } = testData;

const SOURCE_INDEX = 'test-alerting-v2-end-to-end-source';
const ACTION_POLICY_ID = 'end-to-end-policy';

apiTest.describe(
  'End-to-end (executor -> director -> dispatcher)',
  { tag: tags.stateful.classic },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActions.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp();

      await apiServices.alertingV2.sourceIndex.create({
        index: SOURCE_INDEX,
        mappings: {
          'host.name': { type: 'keyword' },
          severity: { type: 'keyword' },
          value: { type: 'long' },
        },
      });

      await apiServices.alertingV2.actionPolicies.upsert(ACTION_POLICY_ID, {
        name: 'Pipeline Policy',
        description: 'Default policy used by the end-to-end smoke tests',
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
      });
    });

    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActions.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.sourceIndex.deleteDocs({
        index: SOURCE_INDEX,
        query: { match_all: {} },
      });

      await apiServices.alertingV2.actionPolicies.patch(ACTION_POLICY_ID, { throttle: null });
      await apiServices.alertingV2.actionPolicies.enable(ACTION_POLICY_ID);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActions.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await apiServices.alertingV2.actionPolicies.cleanUp();
      await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
    });

    apiTest(
      'a breaching rule produces a fire action via the full end-to-end',
      async ({ apiServices }) => {
        const host = 'host-end-to-end-active';

        await apiServices.alertingV2.sourceIndex.indexDocs({
          index: SOURCE_INDEX,
          docs: [
            {
              '@timestamp': new Date().toISOString(),
              'host.name': host,
              severity: 'high',
              value: 1,
            },
          ],
        });

        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            metadata: { name: 'end-to-end-active' },
            query: {
              format: 'standalone',
              breach: {
                query: `FROM ${SOURCE_INDEX} | WHERE host.name == "${host}" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
              },
            },
          })
        );

        // 1) Executor wrote a breach event into `.rule-events`.
        await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, {
          status: 'breached',
        });

        // 2) Director annotated the breach with an active episode.
        await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, {
          episodeStatus: 'active',
        });

        // 3) Dispatcher produced a `fire` action for that rule.
        await apiServices.alertingV2.alertActions.waitForAtLeast(1, {
          ruleId: rule.id,
          actionTypes: ['fire'],
        });
      }
    );

    apiTest(
      'a recovering rule produces a fire action for the inactive transition',
      async ({ apiServices }) => {
        const host = 'host-end-to-end-recovery';

        await apiServices.alertingV2.sourceIndex.indexDocs({
          index: SOURCE_INDEX,
          docs: [
            {
              '@timestamp': new Date().toISOString(),
              'host.name': host,
              severity: 'high',
              value: 1,
            },
          ],
        });

        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            metadata: { name: 'end-to-end-recovery' },
            query: {
              format: 'standalone',
              breach: {
                query: `FROM ${SOURCE_INDEX} | WHERE host.name == "${host}" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
              },
            },
          })
        );

        // 1) Wait for the active-side fire.
        await apiServices.alertingV2.alertActions.waitForAtLeast(1, {
          ruleId: rule.id,
          actionTypes: ['fire'],
        });

        const firesAfterActive = await apiServices.alertingV2.alertActions.find({
          ruleId: rule.id,
          actionTypes: ['fire'],
        });

        const activeFireTimestamps = new Set(
          firesAfterActive.map((f) => f.last_series_event_timestamp)
        );

        // 2) Stop breaching so the executor emits a recovered event.
        await apiServices.alertingV2.sourceIndex.deleteDocs({
          index: SOURCE_INDEX,
          query: { term: { 'host.name': host } },
        });

        // 3) Director must annotate the recovery as `inactive` before the
        //    dispatcher can fire on it (`state_transition: { recovering_count:
        //    0 }` from the builder default skips the `recovering` step).
        await apiServices.alertingV2.ruleEvents.waitForAtLeast(rule.id, 1, {
          episodeStatus: 'inactive',
        });

        // 4) Dispatcher must produce a recovery fire — a `fire` whose
        //    `last_series_event_timestamp` differs from every active fire it
        //    has already written.
        await expect
          .poll(
            async () => {
              const fires = await apiServices.alertingV2.alertActions.find({
                ruleId: rule.id,
                actionTypes: ['fire'],
              });
              return fires.some((f) => !activeFireTimestamps.has(f.last_series_event_timestamp));
            },
            { timeout: POLL_TIMEOUT_MS, intervals: [POLL_INTERVAL_MS] }
          )
          .toBe(true);

        const fires = await apiServices.alertingV2.alertActions.find({
          ruleId: rule.id,
          actionTypes: ['fire'],
        });

        const recoveryFire = fires.find(
          (f) => !activeFireTimestamps.has(f.last_series_event_timestamp)
        );

        expect(recoveryFire).toBeDefined();
      }
    );
  }
);
