/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags, type ApiClientFixture, type EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';
import { createSystemIndicesEsClient } from '../../fixtures/system_indices_es_client';

const RUN_QUOTAS_ENDPOINT = 'internal/significant_events/run_quotas';
const EXECUTIONS_INDEX = '.workflows-executions';
const EVENTS_DATA_STREAM = '.significant_events-events';
const SPACE_ID = 'default';
const DISCOVERY_WORKFLOW_ID = 'system-significant-events-discovery';
const SCHEDULED_REVIEW_WORKFLOW_ID = `system-significant-events-scheduled-review-${SPACE_ID}`;
const KI_ONBOARDING_WORKFLOW_ID = 'system-streams-ki-onboarding';
const CONTINUOUS_KI_ONBOARDING_WORKFLOW_ID = 'system-streams-ki-continuous-onboarding';
const MANAGED_GROUPS = ['detection', 'investigation', 'ki_extraction'] as const;

interface RunQuotaState {
  enabled: boolean;
  limits: Record<string, { enabled: boolean; max: number }>;
}

apiTest.describe(
  'Significant Events run quota managed gates',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;
    let seedEsClient: EsClient;
    let originalState: RunQuotaState;
    const executionIds = new Set<string>();
    const eventIds = new Set<string>();

    apiTest.beforeAll(async ({ samlAuth, esClient, config }) => {
      ({ cookieHeader } = await samlAuth.asStreamsAdmin());
      seedEsClient = await createSystemIndicesEsClient(esClient, config);
    });

    apiTest.beforeEach(async ({ apiClient }) => {
      const [limitsResponse, statusResponse] = await Promise.all([
        apiClient.get(RUN_QUOTAS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }),
        apiClient.get(`${RUN_QUOTAS_ENDPOINT}/_status`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }),
      ]);
      expect(limitsResponse).toHaveStatusCode(200);
      expect(statusResponse).toHaveStatusCode(200);
      originalState = {
        enabled: statusResponse.body.enabled,
        limits: Object.fromEntries(
          limitsResponse.body.groups
            .filter(({ group }: { group: string }) =>
              MANAGED_GROUPS.includes(group as (typeof MANAGED_GROUPS)[number])
            )
            .map(
              ({ group, limit }: { group: string; limit: { enabled: boolean; max: number } }) => [
                group,
                limit,
              ]
            )
        ),
      };
    });

    apiTest.afterEach(async ({ apiClient }) => {
      const response = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_enforcement`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: originalState,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
    });

    apiTest.afterAll(async () => {
      await Promise.all([
        ...[...executionIds].map((id) =>
          seedEsClient.delete({ index: EXECUTIONS_INDEX, id }, { ignore: [404] })
        ),
      ]);
      if (eventIds.size > 0) {
        await seedEsClient.deleteByQuery({
          index: EVENTS_DATA_STREAM,
          conflicts: 'proceed',
          refresh: true,
          query: { terms: { event_id: [...eventIds] } },
        });
      }
    });

    const quotaHeaders = (executionId: string) => ({
      ...COMMON_API_HEADERS,
      ...cookieHeader,
      'x-kibana-workflow-execution-id': executionId,
    });

    const indexExecution = async (execution: Record<string, unknown>) => {
      const id = execution.id as string;
      executionIds.add(id);
      await seedEsClient.index({
        index: EXECUTIONS_INDEX,
        id,
        refresh: true,
        document: execution,
      });
    };

    const seedDetectionChain = async ({
      prefix,
      quotaSlot,
      parentTriggeredBy = 'scheduled',
      childSpaceId = SPACE_ID,
      parentWorkflowId = SCHEDULED_REVIEW_WORKFLOW_ID,
      taskRunAt = new Date().toISOString(),
    }: {
      prefix: string;
      quotaSlot: number;
      parentTriggeredBy?: string;
      childSpaceId?: string;
      parentWorkflowId?: string;
      taskRunAt?: string;
    }) => {
      const parentId = `${prefix}-parent`;
      const childId = `${prefix}-child`;
      await indexExecution({
        id: parentId,
        workflowId: parentWorkflowId,
        spaceId: SPACE_ID,
        status: 'running',
        triggeredBy: parentTriggeredBy,
        taskRunAt,
      });
      await indexExecution({
        id: childId,
        workflowId: DISCOVERY_WORKFLOW_ID,
        spaceId: childSpaceId,
        status: 'running',
        context: {
          parentWorkflowExecutionId: parentId,
          inputs: { quotaSlot },
        },
      });
      return { parentId, childId, taskRunAt };
    };

    const seedKiChain = async ({
      prefix,
      streamName,
      taskRunAt = new Date().toISOString(),
    }: {
      prefix: string;
      streamName: string;
      taskRunAt?: string;
    }) => {
      const parentId = `${prefix}-parent`;
      const childId = `${prefix}-child`;
      await indexExecution({
        id: parentId,
        workflowId: CONTINUOUS_KI_ONBOARDING_WORKFLOW_ID,
        spaceId: SPACE_ID,
        status: 'running',
        triggeredBy: 'scheduled',
        taskRunAt,
      });
      await indexExecution({
        id: childId,
        workflowId: KI_ONBOARDING_WORKFLOW_ID,
        spaceId: SPACE_ID,
        status: 'running',
        context: {
          parentWorkflowExecutionId: parentId,
          inputs: { streamName },
        },
      });
      return { childId, taskRunAt };
    };

    const readGroup = async (apiClient: ApiClientFixture, group: string) => {
      const response = await apiClient.get(RUN_QUOTAS_ENDPOINT, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body.groups.find((candidate: { group: string }) => candidate.group === group);
    };

    apiTest('enforces detection through a managed execution chain', async ({ apiClient }) => {
      const prefix = `scout-detection-${randomUUID()}`;
      const first = await seedDetectionChain({ prefix, quotaSlot: 0 });
      const before = await readGroup(apiClient, 'detection');

      const enable = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_enforcement`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          enabled: true,
          limits: {
            detection: { enabled: true, max: before.counted + 1 },
            ki_extraction: { enabled: false, max: 0 },
          },
        },
        responseType: 'json',
      });
      expect(enable).toHaveStatusCode(200);

      const firstConsume = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_consume?group=detection`, {
        headers: quotaHeaders(first.childId),
        body: { executionId: first.childId },
        responseType: 'json',
      });
      expect(firstConsume).toHaveStatusCode(200);
      expect(firstConsume.body.allowed).toBe(true);

      const denied = await seedDetectionChain({
        prefix: `${prefix}-denied`,
        quotaSlot: 1,
        taskRunAt: first.taskRunAt,
      });
      const denial = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_consume?group=detection`, {
        headers: quotaHeaders(denied.childId),
        body: { executionId: denied.childId },
        responseType: 'json',
      });
      expect(denial).toHaveStatusCode(200);
      expect(denial.body.allowed).toBe(false);
    });

    apiTest('enforces KI extraction through a managed execution chain', async ({ apiClient }) => {
      const prefix = `scout-ki-${randomUUID()}`;
      const before = await readGroup(apiClient, 'ki_extraction');
      const enable = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_enforcement`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          enabled: true,
          limits: {
            ki_extraction: { enabled: true, max: before.counted + 1 },
          },
        },
        responseType: 'json',
      });
      expect(enable).toHaveStatusCode(200);

      const first = await seedKiChain({
        prefix,
        streamName: `logs.scout-${randomUUID()}`,
      });
      const firstConsume = await apiClient.post(
        `${RUN_QUOTAS_ENDPOINT}/_consume?group=ki_extraction`,
        {
          headers: quotaHeaders(first.childId),
          body: { executionId: first.childId },
          responseType: 'json',
        }
      );
      expect(firstConsume).toHaveStatusCode(200);
      expect(firstConsume.body.allowed).toBe(true);

      const denied = await seedKiChain({
        prefix: `${prefix}-denied`,
        streamName: `logs.scout-${randomUUID()}`,
        taskRunAt: first.taskRunAt,
      });
      const denial = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_consume?group=ki_extraction`, {
        headers: quotaHeaders(denied.childId),
        body: { executionId: denied.childId },
        responseType: 'json',
      });
      expect(denial).toHaveStatusCode(200);
      expect(denial.body.allowed).toBe(false);
    });

    apiTest(
      'reserves an open high-severity event through a managed execution chain',
      async ({ apiClient }) => {
        const before = await readGroup(apiClient, 'investigation');
        const enable = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_enforcement`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            enabled: true,
            limits: {
              investigation: { enabled: true, max: before.counted + 1 },
              ki_extraction: { enabled: false, max: 0 },
            },
          },
          responseType: 'json',
        });
        expect(enable).toHaveStatusCode(200);

        const prefix = `scout-reserve-${randomUUID()}`;
        const chain = await seedDetectionChain({ prefix, quotaSlot: 5 });
        const event = {
          eventId: `${prefix}-event-id`,
          eventUuid: `${prefix}-event-uuid`,
          severity: '60-high',
        };
        eventIds.add(event.eventId);

        await seedEsClient.create({
          index: EVENTS_DATA_STREAM,
          id: event.eventUuid,
          refresh: true,
          document: {
            '@timestamp': new Date().toISOString(),
            event_id: event.eventId,
            event_uuid: event.eventUuid,
            status: 'open',
            severity: event.severity,
            kibana: { space_ids: [SPACE_ID] },
          },
        });

        const response = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/investigation/_reserve`, {
          headers: quotaHeaders(chain.childId),
          body: {
            executionId: chain.childId,
            eventId: event.eventId,
            eventUuid: event.eventUuid,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ granted: true });

        const after = await readGroup(apiClient, 'investigation');
        expect(after.counted).toBe(before.counted + 1);
      }
    );
  }
);
