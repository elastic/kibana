/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { getPlaywrightTagsFor, type ScoutPage } from '@kbn/scout';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { RULE_AUTHORING_SKILL_ID } from '@kbn/alerting-v2-constants';
import { expect } from '@kbn/scout/ui';
import {
  agentChatTest as test,
  mockFinalAnswerRenderingRuleAttachment,
  mockLoadSkill,
  mockManageRule,
  mockTitleGeneration,
  type AlertingPageObjects,
} from '../fixtures';

/*
 * End-to-end coverage for the rule attachment canvas that alerting_v2 registers with Agent
 * Builder. The model is scripted through the LLM proxy, but everything else is real: the plugin
 * start contract, DI container, share locators, attachment registry, canvas flyout, and error
 * boundary. Canvas sections are asserted with their real implementations, so a renderer that
 * needs a context the canvas doesn't provide fails here.
 */
const RULE_DESCRIPTION = 'Created from the canvas spec';
const RULE_RENDER_ERROR = 'Timeline renderer threw an error';
const CONVERSATIONS_PATH = '/api/agent_builder/conversations';
const AGENT_BUILDER_PUBLIC_API_HEADERS = {
  'Content-Type': 'application/json',
  'elastic-api-version': '2023-10-31',
};

const CANVAS_SECTIONS = [
  'ruleSummaryAbout',
  'ruleSummaryQueryPreview',
  'ruleSummaryInvestigation',
  'ruleSummaryArtifacts',
  // Only rendered for `alert` rules and needs the alerting locators context.
  'ruleActionPoliciesArtifactsSection',
];

const getConversationIdFromUrl = (page: ScoutPage): string | undefined =>
  page.url().match(/\/conversations\/([^/?#]+)/)?.[1];

const pathnameOf = (url: string): string | undefined => {
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
};

const conversationIdFromBody = (value: unknown): string | undefined => {
  if (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string'
  ) {
    return value.id;
  }
  return undefined;
};

test.describe(
  'Rule attachment canvas in Agent Builder',
  // Local-only: the LLM proxy binds to the runner's loopback, unreachable from a Cloud Kibana.
  {
    tag: [
      ...getPlaywrightTagsFor('stateful', 'classic', 'local'),
      ...getPlaywrightTagsFor('serverless', 'observability_complete', 'local'),
    ],
  },
  () => {
    const testIndex = `alerting-v2-canvas-test-${randomUUID()}`;
    let ownsTestIndex = false;
    let renderErrors: string[] = [];
    const conversationIds = new Set<string>();
    const pendingConversationReads: Array<Promise<void>> = [];
    let ruleNames: string[] = [];

    const rememberConversationId = (conversationId: string | undefined) => {
      if (conversationId) {
        conversationIds.add(conversationId);
      }
    };

    const onConversationCreated = (response: {
      ok: () => boolean;
      url: () => string;
      request: () => { method: () => string };
      json: () => Promise<unknown>;
    }) => {
      if (!response.ok() || response.request().method() !== 'POST') {
        return;
      }
      const pathname = pathnameOf(response.url());
      if (pathname === undefined || !pathname.endsWith(CONVERSATIONS_PATH)) {
        return;
      }
      pendingConversationReads.push(
        response
          .json()
          .then((body) => {
            rememberConversationId(conversationIdFromBody(body));
          })
          .catch(() => undefined)
      );
    };

    const expectDraftInlineCard = async (pageObjects: AlertingPageObjects, ruleName: string) => {
      const message = pageObjects.agentChat.responseMessage;
      await expect(message.getByText(ruleName, { exact: true })).toBeVisible();
      await expect(message.getByRole('heading', { name: 'Description', level: 5 })).toBeVisible();
      await expect(message.getByText(RULE_DESCRIPTION)).toBeVisible();
      await expect(pageObjects.agentChat.inlineSection('ruleInlineOutcome')).toContainText(
        'Alerts'
      );
      await expect(pageObjects.agentChat.inlineSection('ruleInlineStatus')).toContainText('Draft');
      await expect(pageObjects.agentChat.inlineSection('ruleInlineSchedule')).toContainText(
        'Every 1 min'
      );
    };

    const proposeRule = async ({
      page,
      pageObjects,
      llmProxy,
      ruleName,
    }: {
      page: ScoutPage;
      pageObjects: AlertingPageObjects;
      llmProxy: LlmProxy;
      ruleName: string;
    }) => {
      ruleNames.push(ruleName);
      // Each interceptor expires 30s after it is registered, so register after the app loads.
      await pageObjects.agentChat.goto();
      mockTitleGeneration(llmProxy, ruleName);
      mockLoadSkill(llmProxy, RULE_AUTHORING_SKILL_ID);
      mockManageRule(llmProxy, [
        { operation: 'set_metadata', name: ruleName, description: RULE_DESCRIPTION },
        { operation: 'set_kind', kind: 'alert' },
        { operation: 'set_schedule', every: '1m', lookback: '5m' },
        {
          operation: 'set_query',
          query: { base: `FROM ${testIndex} | STATS count = COUNT(*) BY host.name` },
        },
      ]);
      mockFinalAnswerRenderingRuleAttachment(llmProxy, 'Here is the proposed rule.');

      await pageObjects.agentChat.sendMessage(`Create an alert rule named ${ruleName}`);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      // Record the id before the attachment assertions. A failed preview or card check must
      // still leave teardown able to delete the conversation the send already created.
      rememberConversationId(getConversationIdFromUrl(page));

      await expect(pageObjects.agentChat.previewButton).toBeVisible({ timeout: 60_000 });
      await expectDraftInlineCard(pageObjects, ruleName);
    };

    const expectCanvasSectionsVisible = async (pageObjects: AlertingPageObjects) => {
      for (const section of CANVAS_SECTIONS) {
        await expect(pageObjects.agentChat.canvasSection(section)).toBeVisible();
      }
      await expect(pageObjects.agentChat.canvasSection('ruleDescription')).toHaveText(
        RULE_DESCRIPTION
      );
      await expect(pageObjects.agentChat.canvasSection('ruleSummaryRunbookEmpty')).toContainText(
        'No runbook available for this rule.'
      );
      await pageObjects.agentChat.expandCanvasSection('Artifacts');
      await expect(
        pageObjects.agentChat.canvasSection('ruleDashboardArtifactsSection')
      ).toBeVisible();
      await expect(
        pageObjects.agentChat.canvasSection('ruleDashboardArtifactsEmpty')
      ).toContainText('No dashboards linked');
      await expect(pageObjects.agentChat.renderErrorCallout).toHaveCount(0);
    };

    test.beforeAll(async ({ esClient }) => {
      await esClient.indices.create({
        index: testIndex,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
          },
        },
      });
      ownsTestIndex = true;
      await esClient.index({
        index: testIndex,
        document: { '@timestamp': new Date().toISOString(), 'host.name': 'host-1' },
        refresh: 'wait_for',
      });
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      renderErrors = [];
      conversationIds.clear();
      pendingConversationReads.length = 0;
      ruleNames = [];
      page.on('response', onConversationCreated as never);
      page.on('console', (message) => {
        if (message.type() === 'error' && message.text().includes(RULE_RENDER_ERROR)) {
          renderErrors.push(message.text());
        }
      });
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ page, llmProxy, kbnClient, apiServices }) => {
      page.off('response', onConversationCreated as never);
      await Promise.all(pendingConversationReads);
      rememberConversationId(getConversationIdFromUrl(page));
      llmProxy.clear();

      for (const name of ruleNames) {
        const { items } = await apiServices.alertingV2.rules.find({ search: name });
        for (const rule of items.filter(({ metadata }) => metadata.name === name)) {
          await apiServices.alertingV2.rules.delete(rule.id);
        }
      }

      await Promise.allSettled(
        [...conversationIds].map((conversationId) =>
          kbnClient.request({
            method: 'DELETE',
            path: `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
            headers: AGENT_BUILDER_PUBLIC_API_HEADERS,
            ignoreErrors: [404],
          })
        )
      );

      expect(renderErrors).toStrictEqual([]);
    });

    test.afterAll(async ({ esClient }) => {
      if (ownsTestIndex) {
        await esClient.indices.delete({ index: testIndex }, { ignore: [404] });
      }
    });

    test('renders every canvas section for a proposed rule', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      await proposeRule({ page, pageObjects, llmProxy, ruleName: 'Canvas proposed rule' });

      await pageObjects.agentChat.openAttachmentCanvas();

      await expectCanvasSectionsVisible(pageObjects);
      await expect(pageObjects.agentChat.canvasAction('Create rule')).toBeVisible();
      await expect(pageObjects.agentChat.canvasAction('Update Rule')).toHaveCount(0);
    });

    test('Create rule persists the rule and switches to persisted actions', async ({
      page,
      pageObjects,
      llmProxy,
      apiServices,
    }) => {
      const ruleName = 'Canvas created rule';
      await proposeRule({ page, pageObjects, llmProxy, ruleName });
      await pageObjects.agentChat.openAttachmentCanvas();

      await pageObjects.agentChat.canvasAction('Create rule').click();

      await expect(page.getByText(`Rule "${ruleName}" created`)).toBeVisible();
      await expect(pageObjects.agentChat.canvasAction('Update Rule')).toBeVisible();
      await expect(
        await pageObjects.agentChat.openCanvasOverflowAction('View in Rules')
      ).toBeVisible();
      await expect(pageObjects.agentChat.canvasAction('Create rule')).toHaveCount(0);

      await expect(async () => {
        const { items } = await apiServices.alertingV2.rules.find({ search: ruleName });
        expect(items.map(({ metadata }) => metadata.name)).toContain(ruleName);
      }).toPass({ timeout: 30_000 });

      await expectCanvasSectionsVisible(pageObjects);

      await pageObjects.agentChat.closeAttachmentCanvas();
      await expect(pageObjects.agentChat.inlineSection('ruleInlineStatus')).toContainText(
        'Enabled',
        {
          timeout: 15_000,
        }
      );
      await expect(pageObjects.agentChat.responseMessage.getByText(RULE_DESCRIPTION)).toBeVisible();
    });

    test('View in Rules navigates to the persisted rule', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      const ruleName = 'Canvas navigated rule';
      await proposeRule({ page, pageObjects, llmProxy, ruleName });
      await pageObjects.agentChat.openAttachmentCanvas();
      await pageObjects.agentChat.canvasAction('Create rule').click();
      const viewInRules = await pageObjects.agentChat.openCanvasOverflowAction('View in Rules');

      await viewInRules.click();

      await expect(pageObjects.ruleDetails.page).toBeVisible({ timeout: 60_000 });
      await expect(pageObjects.ruleDetails.heading(ruleName)).toBeVisible();
    });

    test('closes and reopens the canvas without losing its content', async ({
      page,
      pageObjects,
      llmProxy,
    }) => {
      await proposeRule({ page, pageObjects, llmProxy, ruleName: 'Canvas reopened rule' });
      await pageObjects.agentChat.openAttachmentCanvas();
      await expectCanvasSectionsVisible(pageObjects);

      await pageObjects.agentChat.closeAttachmentCanvas();
      await expectDraftInlineCard(pageObjects, 'Canvas reopened rule');
      await pageObjects.agentChat.openAttachmentCanvas();

      await expectCanvasSectionsVisible(pageObjects);
    });
  }
);
