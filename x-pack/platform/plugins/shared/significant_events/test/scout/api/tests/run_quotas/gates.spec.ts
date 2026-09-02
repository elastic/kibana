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
const STEP_EXECUTIONS_INDEX = '.workflows-step-executions';
const EVENTS_DATA_STREAM = '.significant_events-events';
const SPACE_ID = 'default';
const DISCOVERY_WORKFLOW_ID = 'system-significant-events-discovery';
const SCHEDULED_REVIEW_WORKFLOW_ID = `system-significant-events-scheduled-review-${SPACE_ID}`;
const KI_ONBOARDING_WORKFLOW_ID = 'system-streams-ki-onboarding';
const KI_DRIVER_WORKFLOW_ID = 'system-streams-ki-continuous-onboarding';

apiTest.describe(
  'Significant Events run quota managed gates',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;
    let seedEsClient: EsClient;
    const executionIds = new Set<string>();
    const stepExecutionIds = new Set<string>();
    const eventIds = new Set<string>();

    apiTest.beforeAll(async ({ samlAuth, esClient, config }) => {
      ({ cookieHeader } = await samlAuth.asStreamsAdmin());
      seedEsClient = await createSystemIndicesEsClient(esClient, config);
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_enforcement`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: { enabled: false },
        responseType: 'json',
      });
      await Promise.all([
        ...[...executionIds].map((id) =>
          seedEsClient.delete({ index: EXECUTIONS_INDEX, id }, { ignore: [404] })
        ),
        ...[...stepExecutionIds].map((id) =>
          seedEsClient.delete({ index: STEP_EXECUTIONS_INDEX, id }, { ignore: [404] })
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

    const readGroup = async (apiClient: ApiClientFixture, group: string) => {
      const response = await apiClient.get(RUN_QUOTAS_ENDPOINT, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body.groups.find((candidate: { group: string }) => candidate.group === group);
    };

    apiTest(
      'records a driver heartbeat and replays a stable detection decision for a replacement execution',
      async ({ apiClient }) => {
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

        const heartbeat = await apiClient.post(
          `${RUN_QUOTAS_ENDPOINT}/_heartbeat?group=detection`,
          {
            headers: quotaHeaders(first.parentId),
            body: { executionId: first.parentId },
            responseType: 'json',
          }
        );
        expect(heartbeat).toHaveStatusCode(200);
        expect(heartbeat.body.recorded).toBe(true);

        const firstConsume = await apiClient.post(
          `${RUN_QUOTAS_ENDPOINT}/_consume?group=detection`,
          {
            headers: quotaHeaders(first.childId),
            body: { executionId: first.childId },
            responseType: 'json',
          }
        );
        expect(firstConsume).toHaveStatusCode(200);
        expect(firstConsume.body.allowed).toBe(true);

        const replacementId = `${prefix}-replacement`;
        await indexExecution({
          id: replacementId,
          workflowId: DISCOVERY_WORKFLOW_ID,
          spaceId: SPACE_ID,
          status: 'running',
          context: {
            parentWorkflowExecutionId: first.parentId,
            inputs: { quotaSlot: 0 },
          },
        });
        const replay = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_consume?group=detection`, {
          headers: quotaHeaders(replacementId),
          body: { executionId: replacementId },
          responseType: 'json',
        });
        expect(replay).toHaveStatusCode(200);
        expect(replay.body.allowed).toBe(true);
        expect((await readGroup(apiClient, 'detection')).counted).toBe(before.counted + 1);

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
      }
    );

    apiTest(
      'accepts the managed default-space KI chain and rejects forged worker provenance',
      async ({ apiClient }) => {
        const before = await readGroup(apiClient, 'ki_extraction');
        const limitResponse = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            limits: {
              ki_extraction: { enabled: true, max: before.counted + 1 },
            },
          },
          responseType: 'json',
        });
        expect(limitResponse).toHaveStatusCode(200);

        const prefix = `scout-ki-${randomUUID()}`;
        const parentId = `${prefix}-parent`;
        const childId = `${prefix}-child`;
        await indexExecution({
          id: parentId,
          workflowId: KI_DRIVER_WORKFLOW_ID,
          spaceId: SPACE_ID,
          status: 'running',
          triggeredBy: 'scheduled',
          taskRunAt: new Date().toISOString(),
        });
        await indexExecution({
          id: childId,
          workflowId: KI_ONBOARDING_WORKFLOW_ID,
          spaceId: SPACE_ID,
          status: 'running',
          context: {
            parentWorkflowExecutionId: parentId,
            inputs: { streamName: 'logs.scout' },
          },
        });

        const consume = await apiClient.post(
          `${RUN_QUOTAS_ENDPOINT}/_consume?group=ki_extraction`,
          {
            headers: quotaHeaders(childId),
            body: { executionId: childId },
            responseType: 'json',
          }
        );
        expect(consume).toHaveStatusCode(200);
        expect(consume.body.allowed).toBe(true);

        for (const invalid of [
          await seedDetectionChain({
            prefix: `scout-manual-${randomUUID()}`,
            quotaSlot: 2,
            parentTriggeredBy: 'manual',
          }),
          await seedDetectionChain({
            prefix: `scout-custom-${randomUUID()}`,
            quotaSlot: 3,
            parentWorkflowId: 'custom-scheduled-parent',
          }),
          await seedDetectionChain({
            prefix: `scout-space-${randomUUID()}`,
            quotaSlot: 4,
            childSpaceId: 'other-space',
          }),
        ]) {
          const response = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_consume?group=detection`, {
            headers: quotaHeaders(invalid.childId),
            body: { executionId: invalid.childId },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(403);
        }

        const forged = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_consume?group=detection`, {
          headers: quotaHeaders('forged-emitter'),
          body: { executionId: childId },
          responseType: 'json',
        });
        expect(forged).toHaveStatusCode(403);
      }
    );

    apiTest(
      'reserves eligible investigations, replays decisions, denies normal events at the cap, and grants critical overrides',
      async ({ apiClient }) => {
        const before = await readGroup(apiClient, 'investigation');
        const limitResponse = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            limits: {
              investigation: { enabled: true, max: before.counted + 1 },
            },
          },
          responseType: 'json',
        });
        expect(limitResponse).toHaveStatusCode(200);

        const prefix = `scout-reserve-${randomUUID()}`;
        const chain = await seedDetectionChain({ prefix, quotaSlot: 5 });
        const events = [
          { suffix: 'first', severity: '60-high' },
          { suffix: 'denied', severity: '60-high' },
          { suffix: 'critical', severity: '80-critical' },
        ].map(({ suffix, severity }) => ({
          eventId: `${prefix}-${suffix}-id`,
          eventUuid: `${prefix}-${suffix}-uuid`,
          severity,
        }));
        events.forEach(({ eventId }) => eventIds.add(eventId));

        const stepId = `${prefix}-store-step`;
        stepExecutionIds.add(stepId);
        await seedEsClient.index({
          index: STEP_EXECUTIONS_INDEX,
          id: stepId,
          refresh: true,
          document: {
            id: stepId,
            stepId: 'store_significant_events',
            stepExecutionIndex: 0,
            output: {
              significant_events: events.map(({ eventId, eventUuid }) => ({
                event_id: eventId,
                event_uuid: eventUuid,
                status: 'open',
                written: true,
              })),
            },
          },
        });
        await indexExecution({
          id: chain.childId,
          workflowId: DISCOVERY_WORKFLOW_ID,
          spaceId: SPACE_ID,
          status: 'running',
          stepExecutionIds: [stepId],
          context: {
            parentWorkflowExecutionId: chain.parentId,
            inputs: { quotaSlot: 5 },
          },
        });
        await Promise.all(
          events.map(({ eventId, eventUuid, severity }) =>
            seedEsClient.create({
              index: EVENTS_DATA_STREAM,
              id: eventUuid,
              refresh: true,
              document: {
                '@timestamp': new Date().toISOString(),
                event_id: eventId,
                event_uuid: eventUuid,
                status: 'open',
                severity,
                kibana: { space_ids: [SPACE_ID] },
              },
            })
          )
        );

        const reserve = async (eventId: string, eventUuid: string) =>
          apiClient.post(`${RUN_QUOTAS_ENDPOINT}/investigation/_reserve`, {
            headers: quotaHeaders(chain.childId),
            body: { executionId: chain.childId, eventId, eventUuid },
            responseType: 'json',
          });

        const first = await reserve(events[0].eventId, events[0].eventUuid);
        expect(first).toHaveStatusCode(200);
        expect(first.body).toMatchObject({ granted: true, pastLimit: false });
        const replay = await reserve(events[0].eventId, events[0].eventUuid);
        expect(replay.body).toMatchObject({ granted: true, pastLimit: false });

        const denied = await reserve(events[1].eventId, events[1].eventUuid);
        expect(denied.body).toMatchObject({ granted: false, reason: 'limit' });
        const critical = await reserve(events[2].eventId, events[2].eventUuid);
        expect(critical.body).toMatchObject({ granted: true, pastLimit: true });

        const after = await readGroup(apiClient, 'investigation');
        expect(after.counted).toBe(before.counted + 2);
        expect(after.withinLimitGrantCount).toBeGreaterThanOrEqual(1);
        expect(after.criticalPastLimitGrantCount).toBeGreaterThanOrEqual(1);
      }
    );
  }
);
