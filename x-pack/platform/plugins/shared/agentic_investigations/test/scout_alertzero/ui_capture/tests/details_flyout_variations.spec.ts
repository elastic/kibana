/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { Locator, Page } from '@playwright/test';
import { REPO_ROOT } from '@kbn/repo-info';
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

const OUT_DIR = resolve(REPO_ROOT, '.playwright-mcp/agent-builder-flyouts');
const SNAPSHOT = 'agentBuilderConversationDetailsFlyout-snapshot';
const LIVE = 'agentBuilderConversationDetailsFlyout-live';

const settle = async (page: Page, flyout: Locator) => {
  await expect(flyout).toBeVisible({ timeout: 30_000 });
  await expect(flyout.locator('.euiLoadingSpinner, .euiSkeletonText')).toHaveCount(0, {
    timeout: 30_000,
  });
  // Lazy slots and avatars land after the spinners go away.
  await page.waitForTimeout(1500);
};

const shoot = async (page: Page, _flyout: Locator, name: string) => {
  await page.mouse.move(600, 800);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
};

test.describe('Conversation details flyout — variation capture', { tag: tags.stateful.classic }, () => {
  let cookieHeader: Record<string, string>;
  let connectorId: string;
  const ids: Record<string, string> = {};

  // AlertZero is only available in a Security-solution space.
  const setDefaultSpaceSolution = (
    kbnClient: { request: (o: Record<string, unknown>) => Promise<unknown> },
    solution: 'security' | 'classic'
  ) =>
    kbnClient.request({
      method: 'PUT',
      path: '/api/spaces/space/default',
      body: { id: 'default', name: 'Default', color: '#00bfb3', solution },
    });

  test.beforeAll(async ({ samlAuth, apiClient, kbnClient }) => {
    await setDefaultSpaceSolution(kbnClient, 'security');
    await kbnClient.uiSettings.update({ 'securitySolution:enableAlertZero': true });
    // The Agent Builder chat renders an "No LLM detected" prompt until any GenAI connector exists.
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

    const investigation = await create('investigationOpen', {
      title: 'Suspicious PowerShell on host-01',
      template_id: 'investigation',
      metadata: {
        status: 'open',
        severity: 'high',
        summary:
          'An encoded PowerShell command spawned from a Word document and contacted an external host.',
      },
    });
    const adminUid = investigation.body.user?.id as string;

    await create('investigationClosed', {
      title: 'Brute force against admin account',
      template_id: 'investigation',
      metadata: {
        status: 'closed',
        severity: 'low',
        close_reason: 'resolved',
        summary: 'Repeated failed logins from a single IP; account locked and IP blocked.',
        assignees: [adminUid],
      },
    });

    await create('plain', { title: 'Plain conversation without a template' });

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
  });

  test.afterAll(async ({ apiClient, kbnClient }) => {
    await setDefaultSpaceSolution(kbnClient, 'classic');
    await kbnClient.uiSettings.unset('securitySolution:enableAlertZero');
    if (connectorId) {
      await kbnClient.request({ method: 'DELETE', path: `/api/actions/connector/${connectorId}` });
    }
    await deleteConversations(apiClient, Object.values(ids), cookieHeader);
  });

  test('snapshot host (openSystemFlyout via AlertZero)', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsAdmin();
    const flyout = page.getByTestId(SNAPSHOT);
    const open = (conversationId: string) =>
      page.goto(kbnUrl.get(`/app/alertzero?selectedConversationId=${conversationId}`));

    await test.step('investigation, open', async () => {
      await open(ids.investigationOpen);
      await settle(page, flyout);
      await shoot(page, flyout, '01-snapshot-investigation-open');
    });

    await test.step('investigation, escalation modal from the footer', async () => {
      const footer = flyout.locator('.euiFlyoutFooter');
      await footer.getByRole('button').last().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT_DIR}/02-snapshot-escalation-modal.png` });
      await page.keyboard.press('Escape');
    });

    await test.step('investigation, closed', async () => {
      await open(ids.investigationClosed);
      await settle(page, flyout);
      await shoot(page, flyout, '03-snapshot-investigation-closed');
    });

    await test.step('escalation', async () => {
      await open(ids.escalation);
      await settle(page, flyout);
      await shoot(page, flyout, '04-snapshot-escalation');
    });

    await test.step('no template', async () => {
      await open(ids.plain);
      await settle(page, flyout);
      await shoot(page, flyout, '05-snapshot-no-template');
    });

    await test.step('error', async () => {
      // A missing conversation closes the flyout with a toast, so a server error stands in for a
      // failed load. The flyout retries three times before it shows the error.
      const conversationRoute = `**/agent_builder/conversations/${ids.investigationOpen}*`;
      await page.route(conversationRoute, (route) => route.fulfill({ status: 500, body: '{}' }));
      await open(ids.investigationOpen);
      await expect(flyout.getByText('Something went wrong')).toBeVisible({ timeout: 30_000 });
      await shoot(page, flyout, '06-snapshot-error');
      await page.unroute(conversationRoute);
    });

    await test.step('loading', async () => {
      await page.route(`**/agent_builder/conversations/${ids.investigationOpen}*`, async (route) => {
        await new Promise((r) => setTimeout(r, 8000));
        await route.continue();
      });
      await open(ids.investigationOpen);
      await expect(flyout.locator('.euiLoadingSpinner')).toBeVisible({ timeout: 30_000 });
      await shoot(page, flyout, '07-snapshot-loading');
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });
  });

  test('snapshot host as viewer (read-only controls)', async ({ page, browserAuth, kbnUrl }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsViewer();
    const flyout = page.getByTestId(SNAPSHOT);
    await page.goto(kbnUrl.get(`/app/alertzero?selectedConversationId=${ids.investigationOpen}`));
    await settle(page, flyout);
    await shoot(page, flyout, '08-snapshot-investigation-viewer');
  });

  test('live host (EuiFlyout in the Agent Builder chat)', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsAdmin();
    const flyout = page.getByTestId(LIVE);
    const chatInfoButton = page.getByTestId('agentBuilderChatInfoButton');
    const open = async (conversationId: string) => {
      await page.goto(
        kbnUrl.get(`/app/agent_builder/agents/elastic-ai-agent/conversations/${conversationId}`)
      );
      await chatInfoButton.click({ timeout: 30_000 });
    };

    await test.step('investigation', async () => {
      await open(ids.investigationOpen);
      await settle(page, flyout);
      await shoot(page, flyout, '09-live-investigation');
    });

    await test.step('escalation', async () => {
      await open(ids.escalation);
      await settle(page, flyout);
      await shoot(page, flyout, '10-live-escalation');
    });

    await test.step('no template: no Chat info button, no flyout', async () => {
      await page.goto(
        kbnUrl.get(`/app/agent_builder/agents/elastic-ai-agent/conversations/${ids.plain}`)
      );
      await page.waitForTimeout(4000);
      await expect(chatInfoButton).toHaveCount(0);
      await expect(flyout).toHaveCount(0);
      await page.screenshot({ path: `${OUT_DIR}/11-live-no-template.png` });
    });
  });
});
