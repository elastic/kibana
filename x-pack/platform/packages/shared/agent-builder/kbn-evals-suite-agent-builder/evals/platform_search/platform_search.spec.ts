/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';
import type { DefaultEvaluators, EvalsExecutorClient } from '@kbn/evals';
import type { AgentBuilderEvaluationChatClient } from '../../src/chat_client';

// Set default evaluators for this spec
// Focus on tool usage, grounding, and relevance - skip Factuality which requires exact content matching
const SPEC_EVALUATORS = ['ToolUsageOnly', 'Groundedness', 'Relevance', 'Sequence Accuracy'];
if (!process.env.SELECTED_EVALUATORS) {
  process.env.SELECTED_EVALUATORS = SPEC_EVALUATORS.join(',');
}

/**
 * Platform Search Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use search and ES|QL tools.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
 *
 * This test creates sample log data before running evaluations to ensure
 * the agent has real data to work with.
 *
 * Run command:
 * ```
 * KIBANA_TESTING_AI_CONNECTORS='<base64-encoded>' \
 * EVALUATION_CONNECTOR_ID=<connector-id> \
 * node scripts/playwright test \
 *   --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts \
 *   evals/platform_search/platform_search.spec.ts \
 *   --project <connector-id>
 * ```
 *
 * Evaluators:
 * - Factuality: Checks if the response is factually correct based on tool results
 * - Relevance: Ensures the response is relevant to the user's question
 * - Groundedness: Verifies claims are supported by tool results
 */

const TEST_INDEX = 'logs-eval-test';

// Sample log data for testing - represents realistic log entries
const SAMPLE_LOGS = [
  {
    '@timestamp': new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    'log.level': 'error',
    message: 'Connection timeout to database server db-prod-01',
    'host.name': 'app-server-1',
    'service.name': 'api-gateway',
  },
  {
    '@timestamp': new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 min ago
    'log.level': 'error',
    message: 'Failed to authenticate user: invalid credentials',
    'host.name': 'auth-server-1',
    'service.name': 'auth-service',
  },
  {
    '@timestamp': new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    'log.level': 'warn',
    message: 'High memory usage detected: 85% utilized',
    'host.name': 'app-server-2',
    'service.name': 'worker-service',
  },
  {
    '@timestamp': new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 min ago
    'log.level': 'info',
    message: 'Service started successfully on port 8080',
    'host.name': 'app-server-1',
    'service.name': 'api-gateway',
  },
  {
    '@timestamp': new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    'log.level': 'error',
    message: 'Disk space critical: only 5% remaining on /var/log',
    'host.name': 'log-server-1',
    'service.name': 'log-aggregator',
  },
  {
    '@timestamp': new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
    'log.level': 'info',
    message: 'Scheduled backup completed successfully',
    'host.name': 'backup-server-1',
    'service.name': 'backup-service',
  },
  {
    '@timestamp': new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    'log.level': 'warn',
    message: 'API rate limit approaching threshold for client xyz-corp',
    'host.name': 'api-gateway-1',
    'service.name': 'api-gateway',
  },
  {
    '@timestamp': new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 min ago - critical alert
    'log.level': 'critical',
    message: 'CRITICAL: Primary database failover initiated',
    'host.name': 'db-primary-1',
    'service.name': 'database',
    'event.severity': 'critical',
  },
];

interface EvaluateDatasetFixture {
  evaluateDataset: EvaluateDataset;
}

interface EvaluateWorkerContext {
  chatClient: AgentBuilderEvaluationChatClient;
  evaluators: DefaultEvaluators;
  phoenixClient: EvalsExecutorClient;
  log: ScoutLogger;
  esClient: EsClient;
}

const evaluate = base.extend<EvaluateDatasetFixture, {}>({
  evaluateDataset: [
    (
      { chatClient, evaluators, phoenixClient, log }: EvaluateWorkerContext,
      use: (dataset: EvaluateDataset) => Promise<void>
    ) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Platform Search Skill', { tag: '@svlOblt' }, () => {
  // Setup: Create test data before running evaluations
  evaluate.beforeAll(async ({ esClient, log }: { esClient: EsClient; log: ScoutLogger }) => {
    log.info(`Creating test index ${TEST_INDEX} with sample log data...`);

    try {
      // Delete existing index if it exists
      const indexExists = await esClient.indices.exists({ index: TEST_INDEX });
      if (indexExists) {
        await esClient.indices.delete({ index: TEST_INDEX });
        log.info(`Deleted existing index ${TEST_INDEX}`);
      }

      // Create index with proper mappings
      await esClient.indices.create({
        index: TEST_INDEX,
        body: {
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              'log.level': { type: 'keyword' },
              message: { type: 'text' },
              'host.name': { type: 'keyword' },
              'service.name': { type: 'keyword' },
              'event.severity': { type: 'keyword' },
            },
          },
        },
      });

      // Index sample documents
      const operations = SAMPLE_LOGS.flatMap((doc) => [
        { index: { _index: TEST_INDEX } },
        doc,
      ]);

      await esClient.bulk({ refresh: true, operations });
      log.info(`Indexed ${SAMPLE_LOGS.length} sample log documents`);
    } catch (error) {
      log.warning(`Failed to create test data: ${error}`);
      // Continue anyway - tests will report "no data found" which is acceptable
    }
  });

  // Cleanup: Remove test data after evaluations
  evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ScoutLogger }) => {
    try {
      const indexExists = await esClient.indices.exists({ index: TEST_INDEX });
      if (indexExists) {
        await esClient.indices.delete({ index: TEST_INDEX });
        log.info(`Cleaned up test index ${TEST_INDEX}`);
      }
    } catch (error) {
      log.warning(`Failed to cleanup test data: ${error}`);
    }
  });

  evaluate(
    'search and ES|QL operations',
    async ({ evaluateDataset }: { evaluateDataset: EvaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'platform search: all operations',
          description:
            'Comprehensive evaluation of search and ES|QL operations with real test data',
          examples: [
            // Basic search - should find error logs
            {
              input: {
                question: `Search for error logs in the last 24 hours from the ${TEST_INDEX} index`,
              },
              output: {
                expected: `Searches for error logs and shows results. Uses tool results.`,
              },
            },
            // ES|QL count by log level
            {
              input: {
                question: `Use ES|QL to count the number of events by log level from ${TEST_INDEX}`,
              },
              output: {
                expected: `Executes ES|QL to count events by log level. Shows counts. Uses tool results.`,
              },
            },
            // Field selection search
            {
              input: {
                question: `Search ${TEST_INDEX} and return only timestamp, host name, and message fields`,
              },
              output: {
                expected: `Searches and returns specified fields. Uses tool results.`,
              },
            },
            // Time range search for critical alerts
            {
              input: {
                question: `Find all critical alerts from the last 15 minutes in ${TEST_INDEX}`,
              },
              output: {
                expected: `Searches for critical alerts and shows results. Uses tool results.`,
              },
            },
          ],
        },
      });
    }
  );
});
