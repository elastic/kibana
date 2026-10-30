/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  ACTION_POLICY_MAX_DESTINATIONS,
  ACTION_POLICY_TEST_SEED_MAX,
  ID_MAX_LENGTH,
} from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICIES_READ_AND_WORKFLOW_EXECUTE_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  buildWorkflowYaml,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

const previewUrl = (id: string) =>
  buildPath(testData.INTERNAL_ACTION_POLICY_TEST_PREVIEW_API_PATH, { id });
const sendUrl = (id: string) => buildPath(testData.INTERNAL_ACTION_POLICY_TEST_API_PATH, { id });

const SEED = 42;

// Sending runs the workflow as the requesting user, who authenticates with an interactive session
// like the UI does. Tagged like the dispatcher workflow execution spec: running a workflow on
// serverless can need a UIAM API key, which the default local serverless config does not grant.
apiTest.describe(
  'Send test notification API',
  { tag: [...tags.stateful.all, '@cloud-serverless-observability_complete'] },
  () => {
    let workflowId: string;
    let policyId: string;
    let expressionPolicyId: string;
    let readerHeaders: Record<string, string>;
    let noAccessHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
      await apiServices.alertingV2.actionPolicies.cleanUp();

      const workflow = await apiServices.alertingV2.workflows.create(
        buildWorkflowYaml('scout-send-test-notification')
      );
      workflowId = workflow.id;

      const policy = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'Send test notification policy',
          destinations: [{ type: 'workflow', id: workflowId }],
          grouping: { mode: 'per_field', fields: ['data.host.name'] },
        })
      );
      policyId = policy.id;

      const expressionPolicy = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'Send test notification expression policy',
          destinations: [{ type: 'workflow', id: workflowId }],
          matcher: { expression: 'severity: critical' },
        })
      );
      expressionPolicyId = expressionPolicy.id;

      const reader = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      readerHeaders = { ...testData.COMMON_HEADERS, ...reader.apiKeyHeader };
      const noAccess = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      noAccessHeaders = { ...testData.COMMON_HEADERS, ...noAccess.apiKeyHeader };
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.cleanUp();
      await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
    });

    apiTest('authorization: rejects users without action policy access', async ({ apiClient }) => {
      const preview = await apiClient.post(previewUrl(policyId), {
        headers: noAccessHeaders,
        body: {},
      });
      expect(preview).toHaveStatusCode(403);

      const send = await apiClient.post(sendUrl(policyId), {
        headers: noAccessHeaders,
        body: { seed: SEED, destination_ids: [workflowId] },
      });
      expect(send).toHaveStatusCode(403);
    });

    apiTest(
      'authorization: a policy reader previews, but needs the workflow execute privilege to send',
      async ({ apiClient }) => {
        const preview = await apiClient.post(previewUrl(policyId), {
          headers: readerHeaders,
          body: { seed: SEED },
        });
        expect(preview).toHaveStatusCode(200);
        expect(preview.body.destinations).toStrictEqual([{ id: workflowId, executable: false }]);

        const send = await apiClient.post(sendUrl(policyId), {
          headers: readerHeaders,
          body: { seed: SEED, destination_ids: [workflowId] },
        });
        expect(send).toHaveStatusCode(403);
      }
    );

    apiTest('validation: rejects unbounded or unknown input', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(
        ALERTING_V2_ACTION_POLICIES_READ_AND_WORKFLOW_EXECUTE_ROLE
      );
      const headers = { ...testData.COMMON_HEADERS, ...cookieHeader };

      const invalidPreviewBodies = [
        { seed: -1 },
        { seed: ACTION_POLICY_TEST_SEED_MAX + 1 },
        { seed: 1.5 },
        { unknown: true },
      ];
      for (const body of invalidPreviewBodies) {
        const response = await apiClient.post(previewUrl(policyId), { headers, body });
        expect(response).toHaveStatusCode(400);
      }

      const invalidSendBodies = [
        { destination_ids: [workflowId] },
        { seed: SEED, destination_ids: [] },
        {
          seed: SEED,
          destination_ids: Array.from(
            { length: ACTION_POLICY_MAX_DESTINATIONS + 1 },
            (_, index) => `workflow-${index}`
          ),
        },
        { seed: SEED, destination_ids: ['a'.repeat(ID_MAX_LENGTH + 1)] },
        { seed: SEED, destination_ids: [workflowId], payload: {} },
      ];
      for (const body of invalidSendBodies) {
        const response = await apiClient.post(sendUrl(policyId), { headers, body });
        expect(response).toHaveStatusCode(400);
      }
    });

    apiTest(
      'rejects destinations that do not belong to the policy',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          ALERTING_V2_ACTION_POLICIES_READ_AND_WORKFLOW_EXECUTE_ROLE
        );

        const response = await apiClient.post(sendUrl(policyId), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: { seed: SEED, destination_ids: [workflowId, 'not-a-destination'] },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.code).toBe('ACTION_POLICY_TEST_INVALID_DESTINATIONS');
        expect(response.body.details).toStrictEqual({
          action_policy_id: policyId,
          destination_ids: ['not-a-destination'],
        });
      }
    );

    apiTest('returns 404 for an unknown action policy', async ({ apiClient }) => {
      const response = await apiClient.post(previewUrl('unknown-policy'), {
        headers: readerHeaders,
        body: {},
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('ACTION_POLICY_NOT_FOUND');
    });

    apiTest(
      'sends a test notification for a policy whose matcher has a KQL expression',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          ALERTING_V2_ACTION_POLICIES_READ_AND_WORKFLOW_EXECUTE_ROLE
        );
        const headers = { ...testData.COMMON_HEADERS, ...cookieHeader };

        const preview = await apiClient.post(previewUrl(expressionPolicyId), {
          headers,
          body: {},
        });
        expect(preview).toHaveStatusCode(200);
        expect(preview.body.groups).toHaveLength(1);

        const send = await apiClient.post(sendUrl(expressionPolicyId), {
          headers,
          body: { seed: preview.body.seed, destination_ids: [workflowId] },
        });
        expect(send).toHaveStatusCode(200);
        expect(typeof send.body.results[0].workflow_execution_id).toBe('string');
      }
    );

    apiTest(
      'sends the previewed payload as a workflow test run, and writes no alert actions',
      async ({ apiClient, apiServices, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          ALERTING_V2_ACTION_POLICIES_READ_AND_WORKFLOW_EXECUTE_ROLE
        );
        const headers = { ...testData.COMMON_HEADERS, ...cookieHeader };

        const preview = await apiClient.post(previewUrl(policyId), {
          headers,
          body: { seed: SEED },
        });
        expect(preview).toHaveStatusCode(200);
        expect(preview.body.seed).toBe(SEED);
        expect(preview.body.destinations).toStrictEqual([
          { id: workflowId, name: 'scout-send-test-notification', enabled: true, executable: true },
        ]);
        const [payload] = preview.body.groups;
        expect(payload.policyId).toBe(policyId);
        expect(Object.keys(payload.groupKey)).toStrictEqual(['data.host.name']);
        expect(payload.groupKey['data.host.name']).toMatch(/^test-/);

        const send = await apiClient.post(sendUrl(policyId), {
          headers,
          body: { seed: SEED, destination_ids: [workflowId] },
        });
        expect(send).toHaveStatusCode(200);
        expect(send.body.results).toHaveLength(1);
        expect(send.body.results[0].workflow_id).toBe(workflowId);
        expect(typeof send.body.results[0].workflow_execution_id).toBe('string');

        const [{ workflow_execution_id: executionId }] = send.body.results;
        const execution = await apiServices.alertingV2.workflows.waitForCompletedExecution(
          executionId
        );
        expect(execution).toMatchObject({ isTestRun: true, workflowId });

        const [alert] = payload.alerts;
        expect(
          await apiServices.alertingV2.alertActionsEvents.find({ ruleId: alert.rule_id })
        ).toHaveLength(0);
        expect(
          await apiServices.alertingV2.alertActionsEvents.find({ groupHash: alert.group_hash })
        ).toHaveLength(0);
      }
    );
  }
);
