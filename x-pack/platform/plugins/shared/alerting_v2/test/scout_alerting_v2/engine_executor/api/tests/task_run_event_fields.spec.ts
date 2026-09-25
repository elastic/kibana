/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We are excluding the @kbn/eslint/scout_require_api_client_in_api_test
 * eslint rule for this file because we do not test APIs but what the rule
 * executor reports about its own runs. The observable surface is the
 * event-log document, not an HTTP response.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { ReportedRun, ReportedRunStatus } from '../../../common/services';
import { apiTest, buildCreateRuleData } from '../fixtures';

/**
 * Every counter the executor publishes, so a test can assert the whole block
 * at once. All of them are written on every reporting run, defaulting to
 * zero, so a quiet run is a row of zeros rather than a set of missing fields.
 */
const ZEROED_COUNTERS = {
  'metrics.signalsGenerated': 0,
  'metrics.ruleEventsGenerated': 0,
  'metrics.newEpisodesGenerated': 0,
  'metrics.rowsReturnedByQuery': 0,
  'metrics.groupsDroppedByLimit': 0,
  'metrics.rowsDroppedByLimit': 0,
} as const;

const reportedStatus =
  (status: ReportedRunStatus) =>
  (run: ReportedRun): boolean =>
    run.status === status;

/**
 * What the executor writes onto Task Manager's `task-run` event under
 * `kibana.task.data`, which is how the execution-history read side learns the
 * fine-grained outcome of a run. ECS `event.outcome` on the same document
 * only carries `success`/`failure`.
 */
apiTest.describe('Rule executor task-run event fields', { tag: tags.stateful.classic }, () => {
  const SOURCE_INDEX = 'test-alerting-v2-task-run-fields-source';

  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.sourceIndex.create({
      index: SOURCE_INDEX,
      mappings: {
        'host.name': { type: 'keyword' },
        value: { type: 'long' },
      },
    });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
  });

  apiTest(
    'reports success, rule identity, and the counters a breaching run produced',
    async ({ apiServices }) => {
      await apiServices.alertingV2.sourceIndex.indexDocs({
        index: SOURCE_INDEX,
        docs: [
          { '@timestamp': new Date().toISOString(), 'host.name': 'host-reports-success', value: 1 },
        ],
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'task-run-fields-success' },
          query: {
            format: 'standalone',
            breach: {
              query: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-reports-success" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
        })
      );

      // Counters are per-run, and only the run that first sees a group opens
      // an episode for it, so select the earliest run that produced events
      // rather than whichever run happened to be reported first.
      const run = await apiServices.alertingV2.ruleExecutions.waitForReportedRun({
        ruleId: rule.id,
        match: (candidate) => (candidate['metrics.ruleEventsGenerated'] ?? 0) > 0,
      });

      expect(run.status).toBe('success');

      // A run that completed without halting has nothing to explain.
      expect(run.reason).toBeUndefined();

      expect(run['rule.id']).toBe(rule.id);
      expect(run['rule.spaceId']).toBe('default');
      expect(run['rule.version']).toBe(rule.metadata.version);

      expect(run['metrics.rowsReturnedByQuery']).toBeGreaterThanOrEqual(1);
      expect(run['metrics.newEpisodesGenerated']).toBeGreaterThanOrEqual(1);

      // `kind: 'alert'` rules persist `type: 'alert'` documents, and the
      // signal counter only counts `type: 'signal'` ones.
      expect(run['metrics.signalsGenerated']).toBe(0);

      // Nothing was truncated, which is why the run is a clean `success`
      // rather than a `warning`.
      expect(run['metrics.groupsDroppedByLimit']).toBe(0);
      expect(run['metrics.rowsDroppedByLimit']).toBe(0);
    }
  );

  apiTest(
    'reports every counter as zero on a run that matches nothing',
    async ({ apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'task-run-fields-quiet' },
          query: {
            format: 'standalone',
            breach: {
              query: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-never-indexed" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
        })
      );

      const run = await apiServices.alertingV2.ruleExecutions.waitForReportedRun({
        ruleId: rule.id,
        match: reportedStatus('success'),
      });

      expect(run).toMatchObject(ZEROED_COUNTERS);
      expect(run.reason).toBeUndefined();
    }
  );

  apiTest(
    'reports failed with the code owned by the step that threw, and still reports counters',
    async ({ apiServices }) => {
      // Targets an index that does not exist. The ES|QL parser accepts the
      // query, so rule creation succeeds and the failure happens at run time
      // inside `execute_rule_query`.
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'task-run-fields-failed' },
          query: {
            format: 'standalone',
            breach: {
              query:
                'FROM nonexistent-index-task-run-fields-zzz | STATS count = COUNT(*) | WHERE count >= 1',
            },
          },
        })
      );

      const run = await apiServices.alertingV2.ruleExecutions.waitForReportedRun({
        ruleId: rule.id,
        match: reportedStatus('failed'),
      });

      // `execute_rule_query` publishes `query_failed`. This asserts the
      // published code rather than the step name, which is exactly the
      // distinction the reason catalog exists to keep.
      expect(run.reason).toBe('query_failed');
      expect(run['rule.id']).toBe(rule.id);
      expect(run['rule.spaceId']).toBe('default');

      // A failing run still reports its counters: they travel out of the
      // pipeline on the error instead of being lost with the return value.
      expect(run).toMatchObject(ZEROED_COUNTERS);
    }
  );

  apiTest(
    'reports skipped with the halt reason when the rule is disabled',
    async ({ apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'task-run-fields-skipped' },
          query: {
            format: 'standalone',
            breach: {
              query: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-skipped" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
        })
      );

      // Wait for one normal run so the task is known to be scheduled and
      // ticking before the rule is taken away from it.
      await apiServices.alertingV2.ruleExecutions.waitForRuns({ ruleId: rule.id, runs: 1 });

      // Disabling through the API unschedules the task, so the halt could only
      // be caught by racing it. Writing the attribute directly leaves the task
      // running against a rule that says it must not.
      await apiServices.alertingV2.ruleSavedObject.setEnabled(rule.id, false);

      const run = await apiServices.alertingV2.ruleExecutions.waitForReportedRun({
        ruleId: rule.id,
        match: reportedStatus('skipped'),
      });

      // A halt is a deliberate early exit, so the run is neither a success nor
      // a failure — and it names which halt it was.
      expect(run.reason).toBe('rule_disabled');
      expect(run['rule.id']).toBe(rule.id);

      // `validate_rule` halts after `fetch_rule`, so the version is known.
      expect(run['rule.version']).toBe(rule.metadata.version);

      // Nothing was evaluated, so every counter is zero.
      expect(run).toMatchObject(ZEROED_COUNTERS);
    }
  );
});
