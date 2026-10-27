/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaywrightTagsFor, type ScoutPage } from '@kbn/scout';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { ACTION_POLICY_AUTHORING_SKILL_ID } from '@kbn/alerting-v2-constants';
import { expect } from '@kbn/scout/ui';
import {
  agentChatTest as test,
  mockFinalAnswerRenderingActionPolicyAttachment,
  mockLoadSkill,
  mockManageActionPolicy,
  mockTitleGeneration,
  type AlertingPageObjects,
} from '../fixtures';

/*
 * End-to-end coverage for the action policy attachment canvas that alerting_v2 registers with
 * Agent Builder. The model is scripted through the LLM proxy, but everything else is real: the
 * plugin start contract, DI container, share locators, attachment registry, canvas flyout, and
 * error boundary.
 */
const POLICY_DESCRIPTION = 'Created from the canvas spec';
const ROUTING_TAG = 'scout-canvas-routing';
const AGENT_BUILDER_PUBLIC_API_HEADERS = {
  'Content-Type': 'application/json',
  'elastic-api-version': '2023-10-31',
};

/**
 * `manage_action_policy` rejects destinations that cannot receive a dispatch, so the workflow
 * declares the notification-group payload on its manual trigger and reads from it.
 */
const buildDispatchWorkflowYaml = (name: string): string => `name: ${JSON.stringify(name)}
enabled: true
description: Scout action policy canvas destination
triggers:
  - type: manual
    inputs:
      properties:
        payload:
          $ref: '#/kibana/definitions/alertingV2NotificationGroup'
steps:
  - name: log
    type: console
    with:
      message: "{{ inputs.payload.alerts | size }} alerts"
`;

const getConversationIdFromUrl = (page: ScoutPage): string | undefined =>
  page.url().match(/\/conversations\/([^/?#]+)/)?.[1];

test.describe(
  'Action policy attachment canvas in Agent Builder',
  // Local-only: the LLM proxy binds to the runner's loopback, unreachable from a Cloud Kibana.
  {
    tag: [
      ...getPlaywrightTagsFor('stateful', 'classic', 'local'),
      ...getPlaywrightTagsFor('serverless', 'observability_complete', 'local'),
    ],
  },
  () => {
    let workflowId: string;
    let workflowName: string;
    let conversationIds: string[] = [];
    let policyNames: string[] = [];

    const expectInlineCard = async (pageObjects: AlertingPageObjects, status: string) => {
      const { agentChat } = pageObjects;
      await expect(agentChat.responseMessage.getByText('Routing tags:')).toBeVisible();
      await expect(agentChat.responseMessage.getByText(ROUTING_TAG, { exact: true })).toBeVisible();
      await expect(agentChat.inlineSection('actionPolicyInlineStatus')).toContainText(status);
      await expect(agentChat.inlineSection('actionPolicyInlineDispatchPer')).toContainText('Alert');
      await expect(agentChat.inlineSection('actionPolicyInlineFrequency')).toContainText(
        'On status change'
      );
      await expect(agentChat.inlineSection('actionPolicyInlineDestination')).toContainText(
        '1 workflow'
      );
    };

    const expectCanvasContent = async (pageObjects: AlertingPageObjects, policyName: string) => {
      const { canvas, renderErrorCallout } = pageObjects.agentChat;
      await expect(canvas.getByRole('heading', { name: policyName, level: 2 })).toBeVisible();
      for (const term of ['Description', 'Matcher', 'Dispatch per', 'Frequency', 'Destinations']) {
        await expect(canvas.getByText(term, { exact: true })).toBeVisible();
      }
      await expect(canvas.getByText(POLICY_DESCRIPTION)).toBeVisible();
      await expect(canvas.getByText('Rule routing tags include')).toBeVisible();
      await expect(canvas.getByText(ROUTING_TAG, { exact: true })).toBeVisible();
      await expect(canvas.getByText('On status change', { exact: true })).toBeVisible();
      await expect(canvas.getByText(workflowName)).toBeVisible();
      await expect(renderErrorCallout).toHaveCount(0);
    };

    const proposePolicy = async ({
      page,
      pageObjects,
      llmProxy,
      policyName,
    }: {
      page: ScoutPage;
      pageObjects: AlertingPageObjects;
      llmProxy: LlmProxy;
      policyName: string;
    }) => {
      policyNames.push(policyName);
      // Each interceptor expires 30s after it is registered, so register after the app loads.
      await pageObjects.agentChat.goto();
      mockTitleGeneration(llmProxy, policyName);
      mockLoadSkill(llmProxy, ACTION_POLICY_AUTHORING_SKILL_ID);
      mockManageActionPolicy(llmProxy, [
        { operation: 'set_metadata', name: policyName, description: POLICY_DESCRIPTION },
        { operation: 'set_destinations', destinations: [{ type: 'workflow', id: workflowId }] },
        { operation: 'set_matcher', matcher: { tags: [ROUTING_TAG] } },
        { operation: 'set_grouping', groupingMode: 'per_alert' },
        { operation: 'set_throttle', strategy: 'on_status_change' },
        { operation: 'validate' },
      ]);
      mockFinalAnswerRenderingActionPolicyAttachment(llmProxy, 'Here is the proposed policy.');

      await pageObjects.agentChat.sendMessage(`Create an action policy named ${policyName}`);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      await expect(pageObjects.agentChat.previewButton).toBeVisible({ timeout: 60_000 });
      await expectInlineCard(pageObjects, 'Draft');
      const conversationId = getConversationIdFromUrl(page);
      if (conversationId) {
        conversationIds.push(conversationId);
      }
    };

    test.beforeAll(async ({ apiServices }) => {
      workflowName = `scout-action-policy-canvas-destination-${Date.now()}`;
      ({ id: workflowId } = await apiServices.alertingV2.workflows.create(
        buildDispatchWorkflowYaml(workflowName)
      ));
    });

    test.beforeEach(async ({ browserAuth }) => {
      conversationIds = [];
      policyNames = [];
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ llmProxy, kbnClient, apiServices }) => {
      llmProxy.clear();

      for (const name of policyNames) {
        const { items } = await apiServices.alertingV2.actionPolicies.list({ search: name });
        for (const policy of items.filter((item) => item.name === name)) {
          await apiServices.alertingV2.actionPolicies.delete(policy.id);
        }
      }

      await Promise.allSettled(
        conversationIds.map((conversationId) =>
          kbnClient.request({
            method: 'DELETE',
            path: `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
            headers: AGENT_BUILDER_PUBLIC_API_HEADERS,
            ignoreErrors: [404],
          })
        )
      );
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
    });

    test('renders the policy definition for a proposed policy', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      const policyName = 'Canvas proposed policy';
      await proposePolicy({ page, pageObjects, llmProxy, policyName });

      await pageObjects.agentChat.openAttachmentCanvas();

      await expectCanvasContent(pageObjects, policyName);
      await expect(pageObjects.agentChat.canvasAction('Create policy')).toBeEnabled();
      await expect(pageObjects.agentChat.canvasAction('Update Policy')).toHaveCount(0);
    });

    test('Create policy persists the policy and switches to persisted actions', async ({
      page,
      pageObjects,
      llmProxy,
      apiServices,
    }) => {
      const policyName = 'Canvas created policy';
      await proposePolicy({ page, pageObjects, llmProxy, policyName });
      await pageObjects.agentChat.openAttachmentCanvas();

      await pageObjects.agentChat.canvasAction('Create policy').click();

      await expect(page.getByText(`Policy "${policyName}" created`, { exact: true })).toBeVisible();
      await expect(pageObjects.agentChat.canvasAction('Update Policy')).toBeVisible();
      await expect(
        await pageObjects.agentChat.openCanvasOverflowAction('View in Policies')
      ).toBeVisible();
      await expect(pageObjects.agentChat.canvasAction('Create policy')).toHaveCount(0);

      const { items } = await apiServices.alertingV2.actionPolicies.list({ search: policyName });
      expect(items.find(({ name }) => name === policyName)).toMatchObject({
        description: POLICY_DESCRIPTION,
        matcher: { tags: [ROUTING_TAG] },
        grouping: { mode: 'per_alert' },
        throttle: { strategy: 'on_status_change' },
        destinations: [{ type: 'workflow', id: workflowId }],
      });

      await expectCanvasContent(pageObjects, policyName);

      await pageObjects.agentChat.closeAttachmentCanvas();
      await expectInlineCard(pageObjects, 'Enabled');
    });

    test('View in Policies opens the persisted policy', async ({ page, pageObjects, llmProxy }) => {
      const policyName = 'Canvas navigated policy';
      await proposePolicy({ page, pageObjects, llmProxy, policyName });
      await pageObjects.agentChat.openAttachmentCanvas();
      await pageObjects.agentChat.canvasAction('Create policy').click();
      await expect(page.getByText(`Policy "${policyName}" created`, { exact: true })).toBeVisible();
      const viewInPolicies = await pageObjects.agentChat.openCanvasOverflowAction(
        'View in Policies'
      );

      await viewInPolicies.click();

      await expect(pageObjects.actionPolicyForm.container).toBeVisible({ timeout: 60_000 });
      await expect(pageObjects.actionPolicyForm.nameInput).toHaveValue(policyName);
    });

    test('closes and reopens the canvas without losing its content', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      const policyName = 'Canvas reopened policy';
      await proposePolicy({ page, pageObjects, llmProxy, policyName });
      await pageObjects.agentChat.openAttachmentCanvas();
      await expectCanvasContent(pageObjects, policyName);

      await pageObjects.agentChat.closeAttachmentCanvas();
      await expectInlineCard(pageObjects, 'Draft');
      await pageObjects.agentChat.openAttachmentCanvas();

      await expectCanvasContent(pageObjects, policyName);
    });
  }
);
