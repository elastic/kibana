/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const SOURCE_INDEX = 'eval-fp-alerts-source';
const ALERTS_INDEX = '.alerts-security.alerts-default';
const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_INDEX_URL = '/api/detection_engine/index';
const FALSE_POSITIVE_THRESHOLD = 10;
const ALERT_POLL_INTERVAL_MS = 3000;
const ALERT_POLL_MAX_ATTEMPTS = 60;

function generateSourceDocs(): Array<Record<string, unknown>> {
  const now = Date.now();
  const docs: Array<Record<string, unknown>> = [];

  for (let i = 0; i < 12; i++) {
    docs.push({
      '@timestamp': new Date(now - i * 60_000).toISOString(),
      'host.name': 'ci-runner-01',
      'user.name': 'svc_deploy',
      'process.parent.name': 'chef-client',
      'process.name': i % 2 === 0 ? 'ruby' : 'converge',
      message: `Chef run ${i}: periodic configuration management`,
      'event.kind': 'event',
    });
  }

  docs.push({
    '@timestamp': new Date(now - 13 * 60_000).toISOString(),
    'host.name': 'web-prod-02',
    'user.name': 'admin',
    'process.parent.name': 'systemd',
    'process.name': 'nginx',
    message: 'Nginx reload triggered by config change',
    'event.kind': 'event',
  });

  docs.push({
    '@timestamp': new Date(now - 14 * 60_000).toISOString(),
    'host.name': 'db-replica-03',
    'user.name': 'postgres',
    'process.parent.name': 'pg_ctl',
    'process.name': 'postgres',
    message: 'Database checkpoint completed',
    'event.kind': 'event',
  });

  docs.push({
    '@timestamp': new Date(now - 15 * 60_000).toISOString(),
    'host.name': 'ci-runner-01',
    'user.name': 'svc_deploy',
    'process.parent.name': 'chef-client',
    'process.name': 'ohai',
    message: 'Chef Ohai plugin gathering system info',
    'event.kind': 'event',
  });

  return docs;
}

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Security Skills - Fix False Positive Alerts',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let ruleId: string | undefined;

    evaluate.beforeAll(async ({ esClient, fetch, log }) => {
      log.info('Seeding source documents for false positive alerts eval');

      const indexExists = await esClient.indices.exists({ index: SOURCE_INDEX });
      if (indexExists) {
        log.info(`Index ${SOURCE_INDEX} already exists — deleting stale data`);
        await esClient.indices.delete({ index: SOURCE_INDEX });
      }

      await esClient.indices.create({
        index: SOURCE_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
            'user.name': { type: 'keyword' },
            'process.parent.name': { type: 'keyword' },
            'process.name': { type: 'keyword' },
            message: { type: 'text' },
            'event.kind': { type: 'keyword' },
          },
        },
      });

      const docs = generateSourceDocs();
      const operations = docs.flatMap((doc) => [{ index: { _index: SOURCE_INDEX } }, doc]);
      await esClient.bulk({ operations, refresh: 'wait_for' });
      log.info(`Indexed ${docs.length} source documents into ${SOURCE_INDEX}`);

      log.info('Ensuring alerts index exists');
      try {
        await fetch(DETECTION_ENGINE_INDEX_URL, {
          method: 'POST',
        });
      } catch (e) {
        log.debug('Alerts index may already exist, continuing');
      }

      log.info('Creating detection rule');
      const ruleResponse = (await fetch(DETECTION_ENGINE_RULES_URL, {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          name: 'Eval FP: Match all source docs',
          description: 'Eval-only rule that matches all documents in the test source index',
          type: 'query',
          query: '*:*',
          index: [SOURCE_INDEX],
          from: '1900-01-01T00:00:00.000Z',
          interval: '1m',
          severity: 'high',
          risk_score: 50,
          rule_id: `eval-fp-rule-${Date.now()}`,
          enabled: true,
        }),
      })) as { id: string };

      ruleId = ruleResponse.id;
      log.info(`Created detection rule with ID: ${ruleId}`);

      log.info(
        `Waiting for at least ${FALSE_POSITIVE_THRESHOLD + 1} alerts (polling every ${
          ALERT_POLL_INTERVAL_MS / 1000
        }s, max ${ALERT_POLL_MAX_ATTEMPTS} attempts)`
      );
      for (let attempt = 1; attempt <= ALERT_POLL_MAX_ATTEMPTS; attempt++) {
        const searchResult = await esClient.search({
          index: ALERTS_INDEX,
          size: 0,
          query: {
            bool: {
              filter: [{ term: { 'kibana.alert.rule.uuid': ruleId } }],
            },
          },
          track_total_hits: true,
        });
        const total =
          typeof searchResult.hits.total === 'number'
            ? searchResult.hits.total
            : searchResult.hits.total?.value ?? 0;

        if (total > FALSE_POSITIVE_THRESHOLD) {
          log.info(
            `Found ${total} alerts after ${attempt} poll(s) — exceeds threshold, proceeding`
          );
          return;
        }

        if (attempt % 10 === 0) {
          log.info(`Poll ${attempt}/${ALERT_POLL_MAX_ATTEMPTS}: ${total} alerts so far`);
        }
        await new Promise((resolve) => setTimeout(resolve, ALERT_POLL_INTERVAL_MS));
      }

      log.warning(
        'Alert polling timed out — tests will run but may see fewer alerts than expected'
      );
    });

    evaluate.afterAll(async ({ esClient, fetch, log }) => {
      if (ruleId) {
        log.info(`Deleting detection rule ${ruleId}`);
        try {
          await fetch(`${DETECTION_ENGINE_RULES_URL}?id=${encodeURIComponent(ruleId)}`, {
            method: 'DELETE',
            version: '2023-10-31',
          });
        } catch (e) {
          log.warning(`Failed to delete rule: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      log.info(`Cleaning up alerts for rule ${ruleId}`);
      try {
        await esClient.deleteByQuery({
          index: ALERTS_INDEX,
          query: ruleId
            ? { bool: { filter: [{ term: { 'kibana.alert.rule.uuid': ruleId } }] } }
            : { match_all: {} },
          refresh: true,
          conflicts: 'proceed',
        });
      } catch (e) {
        log.warning(`Failed to clean alerts: ${e instanceof Error ? e.message : String(e)}`);
      }

      log.info(`Deleting source index ${SOURCE_INDEX}`);
      try {
        await esClient.indices.delete({ index: SOURCE_INDEX });
      } catch (e) {
        log.warning(`Failed to delete source index: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

    evaluate(
      'search-alerts-by-rule detects false positives above threshold',
      async ({ evaluateDataset }) => {
        if (!ruleId) throw new Error('Expected ruleId to be set in beforeAll');

        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-fp-search-alerts-by-rule',
            description:
              'Validates that search-alerts-by-rule detects the rule is producing false positives (alert count exceeds threshold of 10)',
            examples: [
              {
                input: {
                  question: `Check if detection rule ${ruleId} is producing false positives. Use the fix-false-positive-alerts skill to search alerts by rule ID and report the assessment.`,
                },
                output: {
                  expected: `The rule has generated more than ${FALSE_POSITIVE_THRESHOLD} alerts, exceeding the false positive threshold. The assessment flags this rule as likely producing false positives and recommends tuning.`,
                },
                metadata: {
                  query_intent: 'False Positive Detection',
                  expectedSkill: 'fix-false-positive-alerts',
                  expectedOnlyToolId: 'security.fix-false-positive-alerts.search-alerts-by-rule',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'search-alerts-by-host shows ci-runner-01 as the dominant host',
      async ({ evaluateDataset }) => {
        if (!ruleId) throw new Error('Expected ruleId to be set in beforeAll');

        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-fp-search-alerts-by-host',
            description:
              'Validates that search-alerts-by-host identifies ci-runner-01 as the dominant host and chef-client as the top parent process',
            examples: [
              {
                input: {
                  question: `For detection rule ${ruleId}, use the fix-false-positive-alerts skill to search alerts by host. Show me which hosts and parent processes generate the most alerts.`,
                },
                output: {
                  expected:
                    'Host ci-runner-01 generates the majority of alerts. The top parent process is chef-client, which is a configuration management tool and a likely root cause of false positives. Consider excluding by parent process rather than host.',
                },
                metadata: {
                  query_intent: 'Host Analysis',
                  expectedSkill: 'fix-false-positive-alerts',
                  expectedOnlyToolId: 'security.fix-false-positive-alerts.search-alerts-by-host',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'search-alerts-by-user shows svc_deploy as the dominant user',
      async ({ evaluateDataset }) => {
        if (!ruleId) throw new Error('Expected ruleId to be set in beforeAll');

        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-fp-search-alerts-by-user',
            description:
              'Validates that search-alerts-by-user identifies svc_deploy as the dominant user and chef-client as the top parent process',
            examples: [
              {
                input: {
                  question: `For detection rule ${ruleId}, use the fix-false-positive-alerts skill to search alerts by user. Which users and parent processes are triggering the most alerts?`,
                },
                output: {
                  expected:
                    'User svc_deploy generates the majority of alerts. The top parent process is chef-client. Parent processes reveal the root cause of false positives — chef-client is a configuration management tool, so excluding by process.parent.name is recommended.',
                },
                metadata: {
                  query_intent: 'User Analysis',
                  expectedSkill: 'fix-false-positive-alerts',
                  expectedOnlyToolId: 'security.fix-false-positive-alerts.search-alerts-by-user',
                },
              },
            ],
          },
        });
      }
    );

    evaluate.only(
      'full workflow: detect, analyze, add exception, and verify',
      async ({ evaluateDataset }) => {
        if (!ruleId) throw new Error('Expected ruleId to be set in beforeAll');

        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-fp-full-workflow',
            description:
              'End-to-end false positive workflow: detect FP via alert volume, analyze entity breakdowns, add a rule exception for the dominant parent process chef-client, and verify the fix reduces alerts',
            examples: [
              {
                input: {
                  question: `Detection rule ${ruleId} is generating too many false positives. Investigate this rule and fix it: first check the alert volume, then analyze which hosts and parent processes are involved, decide on a tuning strategy, and apply the fix.`,
                },
                output: {
                  expected:
                    'Investigation found the rule exceeds the false positive threshold. Host ci-runner-01 dominates the alerts, and the parent process chef-client accounts for the majority. Following Branch A of the decision tree (parent process > 50%), I added a rule exception excluding process.parent.name chef-client. The fix was verified using compare-rule-fix, which confirmed the exception reduces alert volume.',
                },
                metadata: {
                  query_intent: 'Full Investigation and Remediation',
                  expectedSkill: 'fix-false-positive-alerts',
                },
              },
            ],
          },
        });
      }
    );
  }
);
