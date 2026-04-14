/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { RULE_API_PATH } from '../fixtures';
import type { ExecutionEventSource } from '../../../../server/lib/services/execution_event_logger';

const EVENT_LOG_INDEX = '.kibana-event-log-ds';
const TEST_RULE_ID = 'test-execution-log-rule-001';

/**
 * Builds a test execution event matching the shape written by ExecutionEventLogger.
 * Uses ExecutionEventSource to ensure the test stays in sync with the write shape.
 */
const buildExecutionEvent = ({
  timestamp,
  ruleId,
  outcome,
  durationNs,
  message,
  activeAlerts,
  errorMessage,
}: {
  timestamp: string;
  ruleId: string;
  outcome: 'success' | 'failure';
  durationNs: number;
  message: string;
  activeAlerts?: number;
  errorMessage?: string;
}): ExecutionEventSource => ({
  '@timestamp': timestamp,
  event: {
    provider: 'alertingV2',
    action: 'execute',
    outcome,
    duration: durationNs,
    start: timestamp,
    end: timestamp,
  },
  kibana: {
    alert: {
      rule: {
        execution: {
          metrics:
            activeAlerts != null
              ? { alert_counts: { active: activeAlerts, new: 0, recovered: 0 } }
              : undefined,
        },
      },
    },
    alerting: {
      instance_id: ruleId,
    },
    space_ids: ['default'],
    task: {
      scheduled: timestamp,
    },
  },
  message,
  ...(errorMessage ? { error: { message: errorMessage } } : {}),
});

const TEST_EVENTS = [
  buildExecutionEvent({
    timestamp: '2026-04-10T10:00:00.000Z',
    ruleId: TEST_RULE_ID,
    outcome: 'success',
    durationNs: 150_000_000,
    message: `rule executed: ${TEST_RULE_ID}`,
    activeAlerts: 2,
  }),
  buildExecutionEvent({
    timestamp: '2026-04-10T10:05:00.000Z',
    ruleId: TEST_RULE_ID,
    outcome: 'success',
    durationNs: 200_000_000,
    message: `rule executed: ${TEST_RULE_ID}`,
    activeAlerts: 3,
  }),
  buildExecutionEvent({
    timestamp: '2026-04-10T10:10:00.000Z',
    ruleId: TEST_RULE_ID,
    outcome: 'failure',
    durationNs: 30_050_000_000,
    message: `rule execution failed: Query timeout after 30s`,
    errorMessage: 'Query timeout after 30s',
  }),
  buildExecutionEvent({
    timestamp: '2026-04-10T10:15:00.000Z',
    ruleId: TEST_RULE_ID,
    outcome: 'success',
    durationNs: 180_000_000,
    message: `rule executed: ${TEST_RULE_ID}`,
    activeAlerts: 5,
  }),
];

apiTest.describe('Rule execution log APIs', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esClient }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();

    // Seed execution events directly into the event log index
    const operations = TEST_EVENTS.flatMap((doc) => [{ create: { _index: EVENT_LOG_INDEX } }, doc]);
    await esClient.bulk({ operations, refresh: 'wait_for' });
  });

  apiTest.afterAll(async ({ esClient }) => {
    // Clean up seeded events
    await esClient.deleteByQuery({
      index: EVENT_LOG_INDEX,
      query: {
        bool: {
          filter: [
            { term: { 'event.provider': 'alertingV2' } },
            { term: { 'kibana.alerting.instance_id': TEST_RULE_ID } },
          ],
        },
      },
      refresh: true,
    });
  });

  apiTest(
    '_execution_log: returns execution history sorted by timestamp descending',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        `${RULE_API_PATH}/${TEST_RULE_ID}/_execution_log?date_start=2026-04-10T00:00:00.000Z&date_end=2026-04-10T23:59:59.999Z`,
        {
          headers: { ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );

      expect(response.statusCode).toBe(200);

      const entries = response.body as Array<{
        timestamp: string;
        scheduled_at: string;
        duration_ms: number;
        outcome: string;
        message: string;
        active_alerts: number;
      }>;

      expect(entries).toHaveLength(4);
      // Default sort is desc — most recent first
      expect(entries[0].outcome).toBe('success');
      expect(entries[0].active_alerts).toBe(5);
      expect(entries[1].outcome).toBe('failure');
      expect(entries[1].message).toContain('Query timeout');
      expect(entries[1].active_alerts).toBe(0);
    }
  );

  apiTest('_execution_log: filters by status', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${RULE_API_PATH}/${TEST_RULE_ID}/_execution_log?date_start=2026-04-10T00:00:00.000Z&date_end=2026-04-10T23:59:59.999Z&status_filter=failure`,
      {
        headers: { ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response.statusCode).toBe(200);

    const entries = response.body as Array<{ outcome: string }>;
    expect(entries).toHaveLength(1);
    expect(entries[0].outcome).toBe('failure');
  });

  apiTest('_execution_log: returns duration in milliseconds', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${RULE_API_PATH}/${TEST_RULE_ID}/_execution_log?date_start=2026-04-10T00:00:00.000Z&date_end=2026-04-10T23:59:59.999Z&sort=asc`,
      {
        headers: { ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response.statusCode).toBe(200);

    const entries = response.body as Array<{ duration_ms: number }>;
    // First event: 150_000_000 ns = 150 ms
    expect(entries[0].duration_ms).toBe(150);
    // Third event (failure): 30_050_000_000 ns = 30050 ms
    expect(entries[2].duration_ms).toBe(30050);
  });

  apiTest('_execution_kpi: returns succeeded and failed counts', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${RULE_API_PATH}/${TEST_RULE_ID}/_execution_kpi?date_start=2026-04-10T00:00:00.000Z&date_end=2026-04-10T23:59:59.999Z`,
      {
        headers: { ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response.statusCode).toBe(200);

    const kpi = response.body as { succeeded: number; failed: number };
    expect(kpi.succeeded).toBe(3);
    expect(kpi.failed).toBe(1);
  });

  apiTest('_execution_kpi: returns zeros for empty time range', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${RULE_API_PATH}/${TEST_RULE_ID}/_execution_kpi?date_start=2025-01-01T00:00:00.000Z&date_end=2025-01-01T23:59:59.999Z`,
      {
        headers: { ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response.statusCode).toBe(200);

    const kpi = response.body as { succeeded: number; failed: number };
    expect(kpi.succeeded).toBe(0);
    expect(kpi.failed).toBe(0);
  });
});
