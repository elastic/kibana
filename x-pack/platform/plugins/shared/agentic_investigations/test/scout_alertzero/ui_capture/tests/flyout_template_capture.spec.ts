/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, KbnClient, ScoutPage } from '@kbn/scout';
import { tags, test as baseTest, apiClientFixture, mergeTests } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  AB_CONVERSATIONS_PATH,
  AB_CONVERSATION_BY_ID_PATH,
  PUBLIC_HEADERS,
  cleanupSubjects,
  expectCreated,
  seedSubject,
} from '../../api/fixtures';

const test = mergeTests(baseTest, apiClientFixture);

const CAPTURE_DIR =
  process.env.FLYOUT_CAPTURE_DIR ??
  '/private/tmp/claude-501/-Users-tsullivan-elastic-kibana/e718fae4-22cc-42f8-9cbb-89e7499f84a2/scratchpad/captures';
const CAPTURE_PHASE = process.env.FLYOUT_CAPTURE_PHASE ?? 'after';
const capture = (page: ScoutPage, name: string) =>
  page.screenshot({ path: `${CAPTURE_DIR}/${CAPTURE_PHASE}/${name}.png`, animations: 'disabled' });

const CONVERSATION_ID = '00000000-0000-4000-8000-000000305245';
const CONNECTOR_ID = 'flyout-capture-305245';
const ALERT_UUID = 'a1e2c3d4-0000-4000-8000-000000305245';
const RULE_NAME = 'High CPU on host-01 (305245)';

const SNAPSHOT_FLYOUT = 'agentBuilderConversationDetailsFlyout-snapshot';
const ALERT_FLYOUT = 'investigationSubjectAlertFlyout';

// Served in place of a real rule run, so the alert's fields are identical in every capture.
const alertSource = {
  '@timestamp': '2026-11-13T12:00:00.000Z',
  'kibana.alert.uuid': ALERT_UUID,
  'kibana.alert.status': 'active',
  'kibana.alert.start': '2026-11-13T12:00:00.000Z',
  'kibana.alert.duration.us': 754_000_000,
  'kibana.alert.reason': 'Document count is 1204 in the last 5m in metrics-*. Alert when > 1000.',
  'kibana.alert.rule.name': RULE_NAME,
  'kibana.alert.rule.uuid': 'b2f3e4d5-0000-4000-8000-000000305245',
  'kibana.alert.rule.rule_type_id': '.es-query',
  'kibana.alert.rule.consumer': 'stackAlerts',
  'kibana.alert.rule.tags': ['host-01', 'cpu'],
  'kibana.space_ids': ['default'],
};

test.describe('Investigation alert flyout capture', { tag: tags.stateful.classic }, () => {
  let cookieHeader: Record<string, string>;

  const setDefaultSpaceSolution = (
    kbnClient: KbnClient,
    solution: 'security' | 'classic'
  ) =>
    kbnClient.request({
      method: 'PUT',
      path: '/api/spaces/space/default',
      body: { id: 'default', name: 'Default', color: '#00bfb3', solution },
    });

  const removeSeededData = async ({
    apiClient,
    kbnClient,
    esClient,
  }: {
    apiClient: ApiClientFixture;
    kbnClient: KbnClient;
    esClient: EsClient;
  }) => {
    await apiClient.delete(AB_CONVERSATION_BY_ID_PATH(CONVERSATION_ID), {
      headers: { ...PUBLIC_HEADERS, ...cookieHeader },
    });
    await cleanupSubjects(esClient, [CONVERSATION_ID]);
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/actions/connector/${CONNECTOR_ID}`,
      ignoreErrors: [404],
    });
  };

  test.beforeAll(async ({ samlAuth, apiClient, kbnClient, esClient }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    // AlertZero is only available in a Security-solution space.
    await setDefaultSpaceSolution(kbnClient, 'security');
    await kbnClient.uiSettings.update({ 'securitySolution:enableAlertZero': true });

    // A previous run that did not reach its teardown leaves these ids taken.
    await removeSeededData({ apiClient, kbnClient, esClient });

    // The Agent Builder chat renders a "No LLM detected" prompt until any GenAI connector exists.
    await kbnClient.request({
      method: 'POST',
      path: `/api/actions/connector/${CONNECTOR_ID}`,
      body: {
        name: 'Flyout capture placeholder LLM 305245',
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: 'http://127.0.0.1:1/v1/chat/completions',
          defaultModel: 'gpt-4o',
        },
        secrets: { apiKey: 'unused' },
      },
    });

    const created = await apiClient.post(AB_CONVERSATIONS_PATH, {
      headers: { ...PUBLIC_HEADERS, ...cookieHeader },
      body: {
        conversation_id: CONVERSATION_ID,
        title: 'High CPU on host-01 (305245)',
        template_id: 'investigation',
        access_control: { access_mode: 'public' },
        metadata: {
          status: 'open',
          severity: 'high',
          summary: 'CPU on host-01 stayed above 95% for 12 minutes after a deploy.',
        },
      },
      responseType: 'json',
    });
    expectCreated(created, 'investigation');

    await seedSubject(esClient, {
      conversationId: CONVERSATION_ID,
      type: 'alert',
      id: ALERT_UUID,
      summary: RULE_NAME,
    });
  });

  test.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    await removeSeededData({ apiClient, kbnClient, esClient });
    await kbnClient.uiSettings.unset('securitySolution:enableAlertZero');
    await setDefaultSpaceSolution(kbnClient, 'classic');
  });

  test('alert flyout from the investigation subject', async ({ page, browserAuth, kbnUrl }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1600, height: 1000 });

    await page.route('**/internal/rac/alerts/find', async (route) => {
      if (!(route.request().postData() ?? '').includes(ALERT_UUID)) {
        return route.continue();
      }
      return route.fulfill({
        json: {
          hits: {
            total: 1,
            hits: [
              {
                _id: ALERT_UUID,
                _index: '.internal.alerts-stack.alerts-default-000001',
                _source: alertSource,
              },
            ],
          },
        },
      });
    });

    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(`/app/alertzero?selectedConversationId=${CONVERSATION_ID}`));

    const investigationFlyout = page.getByTestId(SNAPSHOT_FLYOUT);
    await expect(investigationFlyout).toBeVisible({ timeout: 60_000 });
    await investigationFlyout.getByTestId('investigationSubject-alert').click({ timeout: 60_000 });

    const flyout = page.getByTestId(ALERT_FLYOUT);
    await expect(flyout).toBeVisible({ timeout: 30_000 });
    await expect(flyout.getByRole('heading', { name: RULE_NAME })).toBeVisible({
      timeout: 30_000,
    });
    await expect(flyout.locator('.euiLoadingSpinner, .euiSkeletonText')).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(flyout.getByTestId('investigationSubjectAlertFlyoutOverview')).toBeVisible();

    await capture(page, 'investigations-01-alert-flyout');
  });
});
