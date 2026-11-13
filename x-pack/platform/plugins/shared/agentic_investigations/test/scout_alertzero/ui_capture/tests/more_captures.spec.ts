/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { resolve } from 'path';
import type { Page } from '@playwright/test';
import { REPO_ROOT } from '@kbn/repo-info';
import { types } from '@kbn/storage-adapter';
import { tags, test as baseTest, apiClientFixture, mergeTests } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  AB_CONVERSATIONS_PATH,
  CREATE_ESCALATION_PATH,
  INTERNAL_HEADERS,
  PUBLIC_HEADERS,
  deleteConversations,
  expectCreated,
} from '../../api/fixtures';

const test = mergeTests(baseTest, apiClientFixture);

const OUT_DIR = resolve(REPO_ROOT, '.playwright-mcp/agent-builder-flyouts/more');
const SNAPSHOT = 'agentBuilderConversationDetailsFlyout-snapshot';
const LIVE = 'agentBuilderConversationDetailsFlyout-live';
const TREE = 'investigationHypothesisTreeFlyout';
const HYPOTHESES_TYPE = 'investigation_hypotheses';
const HYPOTHESES_INDEX = '.kibana-investigation-hypotheses';

const hashDocumentId = (...parts: string[]): string =>
  createHash('sha256')
    .update(parts.map((part) => `${part.length}:${part}`).join('\0'))
    .digest('hex');

const userMapping = types.object({
  properties: {
    username: types.keyword({}),
    fullName: types.keyword({}),
    email: types.keyword({}),
    profileUid: types.keyword({}),
  },
});

const hypotheses = [
  {
    candidate: 'Encoded PowerShell launched by a macro-enabled Word document',
    confidence: 0.86,
    status: 'confirmed',
    reason: 'WINWORD.EXE spawned powershell.exe -enc within two seconds of the document opening.',
  },
  {
    candidate: 'Scheduled administrative automation',
    confidence: 0.12,
    status: 'dismissed',
    reason: 'No scheduled task or management agent is registered for this command line.',
  },
  {
    candidate: 'Lateral movement from a second compromised host',
    confidence: 0.4,
    status: 'investigating',
    reason: 'One outbound SMB connection to host-02 is still unexplained.',
  },
];

const shoot = async (page: Page, name: string) => {
  await page.mouse.move(600, 800);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
};

const settle = async (page: Page, testId: string) => {
  const flyout = page.getByTestId(testId);
  await expect(flyout).toBeVisible({ timeout: 30_000 });
  await expect(flyout.locator('.euiLoadingSpinner, .euiSkeletonText')).toHaveCount(0, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
};

test.describe('Conversation details flyout — more captures', { tag: tags.stateful.classic }, () => {
  let cookieHeader: Record<string, string>;
  let connectorId: string;
  const ids: Record<string, string> = {};

  const setDefaultSpaceSolution = (
    kbnClient: { request: (o: Record<string, unknown>) => Promise<unknown> },
    solution: 'security' | 'classic'
  ) =>
    kbnClient.request({
      method: 'PUT',
      path: '/api/spaces/space/default',
      body: { id: 'default', name: 'Default', color: '#00bfb3', solution },
    });

  test.beforeAll(async ({ samlAuth, apiClient, kbnClient, esClient }) => {
    await setDefaultSpaceSolution(kbnClient, 'security');
    await kbnClient.uiSettings.update({ 'securitySolution:enableAlertZero': true });
    const { data: connector } = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/actions/connector',
      body: {
        name: 'Flyout capture placeholder LLM',
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: 'http://127.0.0.1:1/v1/chat/completions',
          defaultModel: 'gpt-4o',
        },
        secrets: { apiKey: 'unused' },
      },
    });
    connectorId = connector.id;
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));

    const create = async (label: string, body: Record<string, unknown>) => {
      const res = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: { access_control: { access_mode: 'public' }, ...body },
        responseType: 'json',
      });
      ids[label] = expectCreated(res, label);
      return res;
    };

    const open = await create('investigationOpen', {
      title: 'Suspicious PowerShell on host-01',
      template_id: 'investigation',
      metadata: {
        status: 'open',
        severity: 'high',
        summary: 'An encoded PowerShell command spawned from a Word document.',
      },
    });
    const adminUid = open.body.user?.id as string;
    const escalation = await apiClient.post(CREATE_ESCALATION_PATH, {
      headers: { ...INTERNAL_HEADERS, ...cookieHeader },
      body: {
        linked_investigation_id: ids.investigationOpen,
        visibility: 'public',
        assignees: [adminUid],
      },
      responseType: 'json',
    });
    ids.escalation = expectCreated(escalation, 'escalation');

    // The side index is written directly, as the Nightshift seed script does: no route exists.
    const aliasExists = await esClient.indices.existsAlias({ name: HYPOTHESES_INDEX });
    if (!aliasExists) {
      await esClient.indices.putIndexTemplate({
        name: HYPOTHESES_INDEX,
        create: true,
        index_patterns: [`${HYPOTHESES_INDEX}-*`],
        allow_auto_create: false,
        template: {
          settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
          mappings: {
            dynamic: 'strict',
            properties: {
              spaceId: types.keyword({}),
              conversationId: types.keyword({}),
              hypotheses: types.object({ enabled: false }),
              createdAt: types.date({}),
              updatedAt: types.date({}),
              createdBy: userMapping,
            },
          } as never,
          aliases: { [HYPOTHESES_INDEX]: { is_write_index: true } },
        },
      });
      await esClient.indices.create({ index: `${HYPOTHESES_INDEX}-000001` });
    }
    const docId = hashDocumentId(HYPOTHESES_TYPE, 'default', ids.investigationOpen);
    const now = new Date().toISOString();
    const stored = {
      spaceId: 'default',
      conversationId: ids.investigationOpen,
      hypotheses,
      createdAt: now,
      updatedAt: now,
    };
    await esClient.index({ index: HYPOTHESES_INDEX, id: docId, document: stored, refresh: 'wait_for' });
    const attached = await apiClient.post(
      `${AB_CONVERSATIONS_PATH}/${ids.investigationOpen}/attachments`,
      {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          id: docId,
          type: HYPOTHESES_TYPE,
          origin: docId,
          data: { ...stored, id: docId },
          hidden: true,
          description: 'Hypotheses',
        },
        responseType: 'json',
      }
    );
    if (attached.statusCode !== 200) {
      throw new Error(
        `Attaching hypotheses failed (${attached.statusCode}): ${JSON.stringify(attached.body)}`
      );
    }
    ids.hypothesesDoc = docId;
  });

  test.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    await setDefaultSpaceSolution(kbnClient, 'classic');
    await kbnClient.uiSettings.unset('securitySolution:enableAlertZero');
    if (connectorId) {
      await kbnClient.request({ method: 'DELETE', path: `/api/actions/connector/${connectorId}` });
    }
    if (ids.hypothesesDoc) {
      await esClient.delete({ index: HYPOTHESES_INDEX, id: ids.hypothesesDoc, refresh: true });
    }
    const { hypothesesDoc, ...conversationIds } = ids;
    await deleteConversations(apiClient, Object.values(conversationIds), cookieHeader);
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
  });

  test('escalation as viewer (snapshot host)', async ({ page, browserAuth, kbnUrl }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.get(`/app/alertzero?selectedConversationId=${ids.escalation}`));
    await settle(page, SNAPSHOT);
    await shoot(page, '01-snapshot-escalation-viewer');
  });

  test('escalation as viewer (live host)', async ({ page, browserAuth, kbnUrl }) => {
    await browserAuth.loginAsViewer();
    await page.goto(
      kbnUrl.get(`/app/agent_builder/agents/elastic-ai-agent/conversations/${ids.escalation}`)
    );
    await page.getByTestId('agentBuilderChatInfoButton').click({ timeout: 30_000 });
    await settle(page, LIVE);
    await shoot(page, '02-live-escalation-viewer');
  });

  test('stacked flyout with Back (snapshot host)', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(180_000);
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(`/app/alertzero?selectedConversationId=${ids.investigationOpen}`));
    await settle(page, SNAPSHOT);
    const treeButton = page.getByTestId('investigationHypothesisTreeButton');
    await expect(treeButton).toBeVisible({ timeout: 30_000 });
    await shoot(page, '03-stack-1-details-with-tree-card');

    await treeButton.click();
    const tree = page.getByTestId(TREE);
    await expect(tree).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await shoot(page, '04-stack-2-hypothesis-tree-with-back');

    await tree.getByTestId('euiFlyoutMenuBackButton').click();
    await expect(page.getByTestId(SNAPSHOT)).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await shoot(page, '05-stack-3-after-back');
  });

  test('stacked flyout with Back (live host)', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(180_000);
    await browserAuth.loginAsAdmin();
    await page.goto(
      kbnUrl.get(
        `/app/agent_builder/agents/elastic-ai-agent/conversations/${ids.investigationOpen}`
      )
    );
    await page.getByTestId('agentBuilderChatInfoButton').click({ timeout: 30_000 });
    await settle(page, LIVE);
    await page.getByTestId('investigationHypothesisTreeButton').click();
    await expect(page.getByTestId(TREE)).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await shoot(page, '06-live-stack-hypothesis-tree-with-back');
  });

  test('Public button popover', async ({ page, browserAuth, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(
      kbnUrl.get(
        `/app/agent_builder/agents/elastic-ai-agent/conversations/${ids.investigationOpen}`
      )
    );
    await page.getByRole('button', { name: /sharing/i }).first().click({ timeout: 30_000 });
    await page.waitForTimeout(800);
    await shoot(page, '07-public-button-popover');
  });
});
