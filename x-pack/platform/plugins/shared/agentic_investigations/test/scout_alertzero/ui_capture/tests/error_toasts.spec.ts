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

const OUT_DIR = resolve(REPO_ROOT, '.playwright-mcp/agent-builder-flyouts/toasts');
const SNAPSHOT = 'agentBuilderConversationDetailsFlyout-snapshot';
const LIVE = 'agentBuilderConversationDetailsFlyout-live';
const TOASTS = 'globalToastList';

const serverError = { status: 500, contentType: 'application/json', body: '{"message":"boom"}' };

const settle = async (page: Page, testId: string) => {
  const flyout = page.getByTestId(testId);
  await expect(flyout).toBeVisible({ timeout: 30_000 });
  await expect(flyout.locator('.euiLoadingSpinner, .euiSkeletonText')).toHaveCount(0, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
};

const captureToast = async (page: Page, name: string, text: string | RegExp) => {
  const toasts = page.getByTestId(TOASTS);
  await expect(toasts.getByText(text).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(400);
  await page.mouse.move(600, 800);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
};

test.describe('Conversation details flyout — error toasts', { tag: tags.stateful.classic }, () => {
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
    // AlertZero is only available in a Security-solution space.
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
      metadata: { status: 'open', severity: 'high', summary: 'Encoded PowerShell from Word.' },
    });
    const adminUid = open.body.user?.id as string;
    await create('investigationClosed', {
      title: 'Brute force against admin account',
      template_id: 'investigation',
      metadata: { status: 'closed', severity: 'low', close_reason: 'resolved', summary: 'Locked.' },
    });
    // A second open investigation, so "Add to existing" has an escalation to pick.
    await create('investigationOther', {
      title: 'Lateral movement from host-02',
      template_id: 'investigation',
      metadata: { status: 'open', severity: 'medium', summary: 'SMB admin share access.' },
    });
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

  test.beforeEach(async ({ page, browserAuth }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsAdmin();
  });

  const openSnapshot = (page: Page, kbnUrl: { get: (p: string) => string }, id: string) =>
    page.goto(kbnUrl.get(`/app/alertzero?selectedConversationId=${id}`));

  const openLive = async (page: Page, kbnUrl: { get: (p: string) => string }, id: string) => {
    await page.goto(
      kbnUrl.get(`/app/agent_builder/agents/elastic-ai-agent/conversations/${id}`)
    );
    await page.getByTestId('agentBuilderChatInfoButton').click({ timeout: 30_000 });
  };

  test('01 copy link fails (AlertZero snapshot host)', async ({ page, kbnUrl }) => {
    await page.addInitScript(() => {
      document.execCommand = () => false;
    });
    await openSnapshot(page, kbnUrl, ids.investigationOpen);
    await settle(page, SNAPSHOT);
    await page.getByTestId('investigationDetailsFlyoutCopyLink').click();
    await captureToast(page, '01-copy-link-failed-snapshot', /Couldn.t copy|Could not copy|copy/i);
  });

  test('02 copy link fails (live host)', async ({ page, kbnUrl }) => {
    await page.addInitScript(() => {
      document.execCommand = () => false;
    });
    await openLive(page, kbnUrl, ids.escalation);
    await settle(page, LIVE);
    await page.getByTestId('investigationDetailsFlyoutCopyLink').click();
    await captureToast(page, '02-copy-link-failed-live', /Could not copy the link/);
  });

  test('03 conversation not found (opener)', async ({ page, kbnUrl }) => {
    await openSnapshot(page, kbnUrl, 'does-not-exist');
    await captureToast(page, '03-conversation-not-found', /does not exist/);
  });

  test('04 reopen fails (status toggle)', async ({ page, kbnUrl }) => {
    await page.route('**/internal/investigations/investigations/*/status', (r) =>
      r.fulfill(serverError)
    );
    await openSnapshot(page, kbnUrl, ids.investigationClosed);
    await settle(page, SNAPSHOT);
    await page.getByTestId('connectedStatusToggle').click();
    await page.screenshot({ path: `${OUT_DIR}/_debug-04-popover.png` });
    await page.getByRole('option', { name: /open/i }).or(page.getByText('Open', { exact: true })).last().click();
    await captureToast(page, '04-reopen-failed', /status|Failed/i);
  });

  test('05 severity change fails', async ({ page, kbnUrl }) => {
    await page.route('**/internal/investigations/investigations/*/severity', (r) =>
      r.fulfill(serverError)
    );
    await openSnapshot(page, kbnUrl, ids.investigationOpen);
    await settle(page, SNAPSHOT);
    await page.getByTestId('connectedSeverityPicker').click();
    await page.screenshot({ path: `${OUT_DIR}/_debug-05-popover.png` });
    await page.getByRole('option', { name: /critical/i }).or(page.getByText('Critical', { exact: true })).last().click();
    await captureToast(page, '05-severity-failed', /severity|Failed/i);
  });

  test('06 assignee update fails', async ({ page, kbnUrl }) => {
    await page.route('**/internal/investigations/investigations/*/assignees', (r) =>
      r.fulfill(serverError)
    );
    await openSnapshot(page, kbnUrl, ids.investigationOpen);
    await settle(page, SNAPSHOT);
    await page.getByTestId(new RegExp(`assignToUsersAdd-`) as unknown as string).first().click();
    await page.screenshot({ path: `${OUT_DIR}/_debug-06-popover.png` });
    await page.getByRole('option').first().click();
    await captureToast(page, '06-assignees-failed', /Failed to update assignees/);
  });

  test('07 escalation create fails', async ({ page, kbnUrl }) => {
    await page.route('**/internal/investigations/escalations', (r) =>
      r.request().method() === 'POST' ? r.fulfill(serverError) : r.continue()
    );
    await openSnapshot(page, kbnUrl, ids.investigationOther);
    await settle(page, SNAPSHOT);
    await page.getByTestId(SNAPSHOT).getByRole('button', { name: /escalation/i }).click();
    await page.getByRole('button', { name: 'Open escalation' }).click();
    await captureToast(page, '07-escalation-create-failed', /Failed to create the escalation/);
  });

  test('08 add to existing escalation fails', async ({ page, kbnUrl }) => {
    await page.route('**/internal/investigations/escalations/*/_link', (r) =>
      r.fulfill(serverError)
    );
    await openSnapshot(page, kbnUrl, ids.investigationOther);
    await settle(page, SNAPSHOT);
    await page.getByTestId(SNAPSHOT).getByRole('button', { name: /escalation/i }).click();
    await page.getByText('Add to existing').click();
    await page.screenshot({ path: `${OUT_DIR}/_debug-08-modal.png` });
    await page.getByText('Suspicious PowerShell on host-01').last().click();
    await page.getByRole('button', { name: 'Add to escalation' }).click();
    await captureToast(page, '08-escalation-add-failed', /Failed to add/);
  });

  test('09 escalation sync fails', async ({ page, kbnUrl }) => {
    await page.route('**/internal/investigations/escalations/*/_sync_attachments', (r) =>
      r.fulfill(serverError)
    );
    await openLive(page, kbnUrl, ids.escalation);
    await settle(page, LIVE);
    await captureToast(page, '09-escalation-sync-failed', /Failed to sync attachments/);
  });

  test('10 escalation sync partially fails', async ({ page, kbnUrl }) => {
    await page.route('**/internal/investigations/escalations/*/_sync_attachments', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ copied: 0, failed: 2 }),
      })
    );
    await openLive(page, kbnUrl, ids.escalation);
    await settle(page, LIVE);
    await captureToast(page, '10-escalation-sync-partial', /sync|attachments/i);
  });
});
