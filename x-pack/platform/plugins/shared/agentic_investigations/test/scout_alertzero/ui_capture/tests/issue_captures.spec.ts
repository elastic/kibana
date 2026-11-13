/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { Page } from '@playwright/test';
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

const OUT_DIR = resolve(REPO_ROOT, '.playwright-mcp/agent-builder-flyouts/issue');
const SNAPSHOT = 'agentBuilderConversationDetailsFlyout-snapshot';
const LIVE = 'agentBuilderConversationDetailsFlyout-live';

const settle = async (page: Page, testId: string) => {
  const flyout = page.getByTestId(testId);
  await expect(flyout).toBeVisible({ timeout: 30_000 });
  await expect(flyout.locator('.euiLoadingSpinner, .euiSkeletonText')).toHaveCount(0, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
};

test.describe('Conversation details flyout — issue captures', { tag: tags.stateful.classic }, () => {
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

  test.beforeAll(async ({ samlAuth, apiClient, kbnClient }) => {
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

    const placeholder = await apiClient.post(AB_CONVERSATIONS_PATH, {
      headers: { ...PUBLIC_HEADERS, ...cookieHeader },
      body: { title: 'placeholder', access_control: { access_mode: 'public' } },
      responseType: 'json',
    });
    ids.placeholder = expectCreated(placeholder, 'placeholder');
    const adminUid = placeholder.body.user?.id as string;

    const investigation = await apiClient.post(AB_CONVERSATIONS_PATH, {
      headers: { ...PUBLIC_HEADERS, ...cookieHeader },
      body: {
        title: 'Suspicious PowerShell on host-01',
        template_id: 'investigation',
        access_control: { access_mode: 'public' },
        metadata: {
          status: 'open',
          severity: 'high',
          summary:
            'An encoded PowerShell command spawned from a Word document and contacted an external host.',
          assignees: [adminUid],
        },
      },
      responseType: 'json',
    });
    ids.investigation = expectCreated(investigation, 'investigation');

    const escalation = await apiClient.post(CREATE_ESCALATION_PATH, {
      headers: { ...INTERNAL_HEADERS, ...cookieHeader },
      body: {
        linked_investigation_id: ids.investigation,
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

  test.beforeEach(async ({ page, browserAuth }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsAdmin();
  });

  const openLive = async (page: Page, kbnUrl: { get: (p: string) => string }, id: string) => {
    await page.goto(
      kbnUrl.get(`/app/agent_builder/agents/elastic-ai-agent/conversations/${id}`)
    );
    await page.getByTestId('agentBuilderChatInfoButton').click({ timeout: 30_000 });
    await settle(page, LIVE);
  };

  test('live: investigation with assignee', async ({ page, kbnUrl }) => {
    await openLive(page, kbnUrl, ids.investigation);
    await page.screenshot({ path: `${OUT_DIR}/live-investigation.png` });
  });

  test('live: escalation with assignee', async ({ page, kbnUrl }) => {
    await openLive(page, kbnUrl, ids.escalation);
    await page.screenshot({ path: `${OUT_DIR}/live-escalation.png` });
  });

  test('snapshot: investigation from the AlertZero queue', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/alertzero?selectedConversationId=${ids.investigation}`));
    await settle(page, SNAPSHOT);
    await page.screenshot({ path: `${OUT_DIR}/snapshot-investigation.png` });
  });
});
