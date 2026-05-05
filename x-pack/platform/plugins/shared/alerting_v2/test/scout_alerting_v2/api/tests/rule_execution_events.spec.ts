/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import { API_HEADERS, RULE_API_PATH } from '../fixtures';

const EVENT_LOG_INDEX = '.kibana-event-log-*';

type RuleExecutorEventDoc = NonNullable<IValidatedEvent>;

apiTest.describe('Rule executor execution history events', { tag: tags.stateful.classic }, () => {
  const SOURCE_INDEX = 'test-rule-execution-events-source';
  const NONEXISTENT_INDEX = 'rule-execution-events-no-such-index-xyz';
  const SCHEDULE_INTERVAL = '5s';
  const LOOKBACK_WINDOW = '1m';
  const POLL_INTERVAL_MS = 1000;
  const POLL_TIMEOUT_MS = 60_000;

  const ruleIds: string[] = [];

  apiTest.beforeAll(async ({ esClient }) => {
    await esClient.indices.create(
      {
        index: SOURCE_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
          },
        },
      },
      { ignore: [400] }
    );
  });

  apiTest.afterAll(async ({ esClient, apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

    for (const ruleId of ruleIds) {
      await apiClient
        .delete(`${RULE_API_PATH}/${ruleId}`, {
          headers: { ...API_HEADERS, ...apiKeyHeader },
        })
        .catch(() => {});

      await esClient
        .deleteByQuery(
          {
            index: EVENT_LOG_INDEX,
            query: byRuleSavedObjectQuery(ruleId),
            refresh: true,
            wait_for_completion: true,
            conflicts: 'proceed',
          },
          { ignore: [404] }
        )
        .catch(() => {});
    }

    await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
  });

  /**
   * Polls `.kibana-event-log-*` for events tied to this rule's saved-object
   * reference until at least `expectedCount` docs of the given action exist.
   * Returns the matched docs sorted by `@timestamp asc`.
   */
  async function waitForRuleExecutorEvents(
    esClient: EsClient,
    ruleId: string,
    action: 'execute-start' | 'execute',
    expectedCount: number
  ): Promise<RuleExecutorEventDoc[]> {
    const start = Date.now();

    while (Date.now() - start < POLL_TIMEOUT_MS) {
      await esClient.indices.refresh({ index: EVENT_LOG_INDEX }).catch(() => {});

      const result = await esClient.search<RuleExecutorEventDoc>({
        index: EVENT_LOG_INDEX,
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'alerting_v2' } },
              { term: { 'event.action': action } },
              byRuleSavedObjectQuery(ruleId),
            ],
          },
        },
        sort: [{ '@timestamp': 'asc' }],
        size: 50,
      });

      if (result.hits.hits.length >= expectedCount) {
        return result.hits.hits.map((hit) => hit._source as RuleExecutorEventDoc);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      `Timed out after ${POLL_TIMEOUT_MS}ms waiting for ${expectedCount} ${action} events for rule ${ruleId}`
    );
  }

  apiTest(
    'emits one execute-start and one execute per successful run, sharing the same execution.uuid',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      const createResponse = await apiClient.post(RULE_API_PATH, {
        headers: { ...API_HEADERS, ...apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name: 'execution-events-success', tags: ['e2e', 'execution-history'] },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
        },
        responseType: 'json',
      });

      expect(createResponse.statusCode).toBe(200);
      const ruleId = createResponse.body.id;
      ruleIds.push(ruleId);

      const [startEvent] = await waitForRuleExecutorEvents(esClient, ruleId, 'execute-start', 1);
      const [executeEvent] = await waitForRuleExecutorEvents(esClient, ruleId, 'execute', 1);

      // Both events share the same execution uuid (run correlation)
      const startUuid = startEvent.kibana?.alerting_v2?.rule_executor?.execution?.uuid;
      const executeUuid = executeEvent.kibana?.alerting_v2?.rule_executor?.execution?.uuid;
      expect(startUuid).toBeDefined();
      expect(executeUuid).toBe(startUuid);

      // Beacon fields
      expect(startEvent.event?.provider).toBe('alerting_v2');
      expect(startEvent.event?.action).toBe('execute-start');
      expect(startEvent.kibana?.alerting_v2?.rule_executor?.rule?.id).toBe(ruleId);

      // Summary fields
      expect(executeEvent.event?.provider).toBe('alerting_v2');
      expect(executeEvent.event?.action).toBe('execute');
      expect(executeEvent.event?.outcome).toBe('success');
      expect(executeEvent.event?.start).toBeDefined();
      expect(executeEvent.event?.end).toBeDefined();
      expect(typeof executeEvent.event?.duration).toBe('number');
      expect(executeEvent.event?.duration).toBeGreaterThanOrEqual(0);

      const ruleExecutor = executeEvent.kibana?.alerting_v2?.rule_executor;
      expect(ruleExecutor?.execution?.status).toBe('success');
      expect(typeof ruleExecutor?.execution?.metrics?.total_run_duration_ms).toBe('number');
      expect(ruleExecutor?.execution?.metrics?.total_run_duration_ms).toBeGreaterThanOrEqual(0);

      // Rule attributes captured at execution time
      expect(ruleExecutor?.rule?.id).toBe(ruleId);
      expect(ruleExecutor?.rule?.name).toBe('execution-events-success');
      expect(ruleExecutor?.rule?.kind).toBe('alert');
      expect(ruleExecutor?.rule?.tags).toContain('e2e');
      expect(ruleExecutor?.rule?.tags).toContain('execution-history');

      // Saved-object reference (drives event_log RBAC)
      const savedObjects = executeEvent.kibana?.saved_objects ?? [];
      expect(savedObjects).toHaveLength(1);
      expect(savedObjects[0]?.type).toBe('alerting_rule');
      expect(savedObjects[0]?.id).toBe(ruleId);
      expect(savedObjects[0]?.rel).toBe('primary');

      // Common task envelope (lag signal lives here)
      expect(executeEvent.kibana?.task?.id).toBeDefined();
      expect(executeEvent.kibana?.task?.type).toBe('alerting_v2:rule_executor');
      expect(executeEvent.kibana?.task?.scheduled).toBeDefined();
      expect(typeof executeEvent.kibana?.task?.schedule_delay).toBe('number');
      expect(executeEvent.kibana?.task?.schedule_delay).toBeGreaterThanOrEqual(0);

      // Step-level metrics flow from the in-pipeline collector into the summary
      const metrics = ruleExecutor?.execution?.metrics;
      expect(metrics?.query?.number_of_searches).toBeGreaterThanOrEqual(1);
      expect(typeof metrics?.query?.total_search_duration_ms).toBe('number');
      // No data → store step records breached=0/recovered=0/no_data=0
      expect(metrics?.events_written?.total).toBe(0);
      // No-breach recovery policy on this rule → recovery mode is set by the step
      expect(metrics?.recovery?.mode).toBe('no_breach');
    }
  );

  apiTest(
    'emits a failed execute (with error and reason) when the pipeline throws',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      // ES|QL accepts this query syntactically; the index does not exist,
      // so ExecuteRuleQueryStep throws at runtime — exercises the error path.
      const createResponse = await apiClient.post(RULE_API_PATH, {
        headers: { ...API_HEADERS, ...apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name: 'execution-events-failure' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${NONEXISTENT_INDEX} | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
        },
        responseType: 'json',
      });

      expect(createResponse.statusCode).toBe(200);
      const ruleId = createResponse.body.id;
      ruleIds.push(ruleId);

      // Beacon fires before the failing step, so we should still see one
      await waitForRuleExecutorEvents(esClient, ruleId, 'execute-start', 1);

      const [executeEvent] = await waitForRuleExecutorEvents(esClient, ruleId, 'execute', 1);

      expect(executeEvent.event?.outcome).toBe('failure');
      expect(executeEvent.event?.reason).toBe('query_failed');
      expect(executeEvent.kibana?.alerting_v2?.rule_executor?.execution?.status).toBe('failed');
      expect(executeEvent.error?.message).toBeDefined();
      expect(typeof executeEvent.error?.message).toBe('string');
      expect((executeEvent.error?.message ?? '').length).toBeGreaterThan(0);
    }
  );

  apiTest(
    'events are queryable via the saved-object reference and registered actions appear in the event log',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      const createResponse = await apiClient.post(RULE_API_PATH, {
        headers: { ...API_HEADERS, ...apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name: 'execution-events-queryable' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
        },
        responseType: 'json',
      });

      expect(createResponse.statusCode).toBe(200);
      const ruleId = createResponse.body.id;
      ruleIds.push(ruleId);

      // Wait for the pair to land
      await waitForRuleExecutorEvents(esClient, ruleId, 'execute-start', 1);
      await waitForRuleExecutorEvents(esClient, ruleId, 'execute', 1);

      // Aggregate event.action for this rule's events — confirms both action
      // types are accepted by the alerting_v2 provider's whitelist.
      await esClient.indices.refresh({ index: EVENT_LOG_INDEX }).catch(() => {});

      const aggResult = await esClient.search({
        index: EVENT_LOG_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [{ term: { 'event.provider': 'alerting_v2' } }, byRuleSavedObjectQuery(ruleId)],
          },
        },
        aggs: {
          actions: { terms: { field: 'event.action', size: 10 } },
        },
      });

      const actionsAgg = aggResult.aggregations?.actions as
        | { buckets: Array<{ key: string; doc_count: number }> }
        | undefined;
      const actionKeys = (actionsAgg?.buckets ?? []).map((b) => b.key);

      expect(actionKeys).toContain('execute-start');
      expect(actionKeys).toContain('execute');
    }
  );
});

/**
 * Builds the nested `kibana.saved_objects` filter that mirrors the
 * `findEventsBySavedObjectIds('alerting_rule', [ruleId])` query path —
 * the same shape Issue 2's read APIs will use.
 */
function byRuleSavedObjectQuery(ruleId: string) {
  return {
    nested: {
      path: 'kibana.saved_objects',
      query: {
        bool: {
          filter: [
            { term: { 'kibana.saved_objects.type': 'alerting_rule' } },
            { term: { 'kibana.saved_objects.id': ruleId } },
          ],
        },
      },
    },
  };
}
