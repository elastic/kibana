/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS } from '@kbn/management-settings-ids';
import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

const TEST_STREAM_NAME = 'logs-attachments-test';
const TEST_DASHBOARD_ID = 'attachments-test-dashboard';
const TEST_DASHBOARD_TITLE = 'Attachments Test Dashboard';
const TEST_RULE_NAME = 'attachments-test-rule';
const TEST_SLO_NAME = 'Attachments Test SLO';

// TODO: Re-enable on serverless once https://github.com/elastic/kibana/issues/248090 is resolved
test.describe('Attachments', { tag: ['@ess'] }, () => {
  let ruleId: string;
  let sloId: string;

  test.beforeAll(async ({ logsSynthtraceEsClient, kbnClient, apiServices }) => {
    // Enable attachments feature
    await kbnClient.uiSettings.update({
      [OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS]: true,
    });

    const currentTime = Date.now();
    // Generate some logs to create the stream
    await generateLogsData(logsSynthtraceEsClient)({
      index: TEST_STREAM_NAME,
      startTime: new Date(currentTime - 5 * 60 * 1000).toISOString(),
      endTime: new Date(currentTime).toISOString(),
      docsPerMinute: 1,
    });

    // Create a dashboard
    await kbnClient.savedObjects.create({
      type: 'dashboard',
      id: TEST_DASHBOARD_ID,
      overwrite: true,
      attributes: {
        title: 'Attachments Test Dashboard',
        description: 'Dashboard for testing attachments',
      },
    });

    // Create a rule
    const ruleResponse = await apiServices.alerting.rules.create({
      name: TEST_RULE_NAME,
      ruleTypeId: '.index-threshold',
      consumer: 'alerts',
      enabled: false,
      schedule: { interval: '1m' },
      actions: [],
      params: {
        aggType: 'count',
        termSize: 5,
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        groupBy: 'all',
        threshold: [1000],
        index: [TEST_STREAM_NAME],
        timeField: '@timestamp',
      },
    });
    ruleId = ruleResponse.data.id;

    // Create an SLO
    const sloResponse = await kbnClient.request<{ id: string }>({
      path: '/api/observability/slos',
      method: 'POST',
      body: {
        name: 'Attachments Test SLO',
        description: 'SLO for testing attachments',
        indicator: {
          type: 'sli.kql.custom',
          params: {
            index: TEST_STREAM_NAME,
            filter: '',
            good: 'log.level : "INFO"',
            total: '',
            timestampField: '@timestamp',
          },
        },
        budgetingMethod: 'occurrences',
        timeWindow: {
          duration: '30d',
          type: 'rolling',
        },
        objective: {
          target: 0.99,
        },
        tags: [],
        settings: {
          preventInitialBackfill: true,
        },
      },
    });
    sloId = sloResponse.data.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    // Delete the SLO
    if (sloId) {
      await kbnClient.request({
        path: `/api/observability/slos/${sloId}`,
        method: 'DELETE',
      });
    }

    // Delete the rule
    if (ruleId) {
      await apiServices.alerting.rules.delete(ruleId);
    }

    // Delete the dashboard
    await kbnClient.savedObjects.delete({
      type: 'dashboard',
      id: TEST_DASHBOARD_ID,
    });

    // Delete the stream
    await apiServices.streams.deleteStream(TEST_STREAM_NAME);

    // Disable attachments feature
    await kbnClient.uiSettings.update({
      [OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS]: false,
    });
  });

  test('shows empty attachments prompt when navigating to attachments tab', async ({
    pageObjects,
  }) => {
    await pageObjects.streams.gotoAttachmentsTab(TEST_STREAM_NAME);
    await pageObjects.streams.expectAttachmentsEmptyPromptVisible();
  });

  test('opens add attachment flyout and shows available attachments', async ({ pageObjects }) => {
    await pageObjects.streams.gotoAttachmentsTab(TEST_STREAM_NAME);
    await pageObjects.streams.clickAddAttachmentsButton();
    await pageObjects.streams.expectAddAttachmentFlyoutVisible();

    // Verify the dashboard is visible in the flyout
    await pageObjects.streams.expectAttachmentInFlyout(TEST_DASHBOARD_TITLE);

    // Verify the rule is visible in the flyout
    await pageObjects.streams.expectAttachmentInFlyout(TEST_RULE_NAME);

    // Verify the SLO is visible in the flyout
    await pageObjects.streams.expectAttachmentInFlyout(TEST_SLO_NAME);
  });

  test('adds and removes all attachments from the stream', async ({ pageObjects }) => {
    // Navigate to attachments tab
    await pageObjects.streams.gotoAttachmentsTab(TEST_STREAM_NAME);
    await pageObjects.streams.clickAddAttachmentsButton();
    await pageObjects.streams.expectAddAttachmentFlyoutVisible();

    // Select all attachments
    await pageObjects.streams.selectAllAttachmentsInFlyout();

    // Click add to stream
    await pageObjects.streams.clickAddToStreamButton();

    // Verify the attachments table is visible (no longer empty prompt)
    await pageObjects.streams.expectAttachmentsTableVisible();

    // Verify all attachments are in the table
    await pageObjects.streams.expectAttachmentInTable(TEST_DASHBOARD_TITLE);
    await pageObjects.streams.expectAttachmentInTable(TEST_RULE_NAME);
    await pageObjects.streams.expectAttachmentInTable(TEST_SLO_NAME);

    // Verify the count
    await pageObjects.streams.expectAttachmentsCount(3);

    // Now remove all attachments
    // Select all attachments in the table
    await pageObjects.streams.selectAllAttachmentsInTable();

    // Click on the selected attachments link to open the popover
    await pageObjects.streams.clickSelectedAttachmentsLink();

    // Click remove attachments in the popover
    await pageObjects.streams.clickRemoveAttachmentsInPopover();

    // Confirm the removal in the modal
    await pageObjects.streams.confirmRemoveAttachments();

    // Verify the empty prompt is shown again
    await pageObjects.streams.expectAttachmentsEmptyPromptVisible();
  });

  test('opens attachment details flyout and verifies information for each type', async ({
    pageObjects,
  }) => {
    // First, link all attachments
    await pageObjects.streams.gotoAttachmentsTab(TEST_STREAM_NAME);
    await pageObjects.streams.clickAddAttachmentsButton();
    await pageObjects.streams.expectAddAttachmentFlyoutVisible();
    await pageObjects.streams.selectAllAttachmentsInFlyout();
    await pageObjects.streams.clickAddToStreamButton();
    await pageObjects.streams.expectAttachmentsTableVisible();

    // Test Dashboard details flyout
    await pageObjects.streams.clickAttachmentDetailsButton(TEST_DASHBOARD_TITLE);
    await pageObjects.streams.expectAttachmentDetailsFlyoutVisible();
    await pageObjects.streams.expectAttachmentDetailsFlyoutTitle(TEST_DASHBOARD_TITLE);
    await pageObjects.streams.expectAttachmentDetailsFlyoutDescription(
      'Dashboard for testing attachments'
    );
    await pageObjects.streams.expectAttachmentDetailsFlyoutType('Dashboard');
    await pageObjects.streams.expectAttachmentDetailsFlyoutHasStream(TEST_STREAM_NAME);
    await pageObjects.streams.closeAttachmentDetailsFlyout();

    // Test Rule details flyout
    await pageObjects.streams.clickAttachmentDetailsButton(TEST_RULE_NAME);
    await pageObjects.streams.expectAttachmentDetailsFlyoutVisible();
    await pageObjects.streams.expectAttachmentDetailsFlyoutTitle(TEST_RULE_NAME);
    await pageObjects.streams.expectAttachmentDetailsFlyoutType('Rule');
    await pageObjects.streams.expectAttachmentDetailsFlyoutHasStream(TEST_STREAM_NAME);
    await pageObjects.streams.closeAttachmentDetailsFlyout();

    // Test SLO details flyout
    await pageObjects.streams.clickAttachmentDetailsButton(TEST_SLO_NAME);
    await pageObjects.streams.expectAttachmentDetailsFlyoutVisible();
    await pageObjects.streams.expectAttachmentDetailsFlyoutTitle(TEST_SLO_NAME);
    await pageObjects.streams.expectAttachmentDetailsFlyoutDescription(
      'SLO for testing attachments'
    );
    await pageObjects.streams.expectAttachmentDetailsFlyoutType('SLO');
    await pageObjects.streams.expectAttachmentDetailsFlyoutHasStream(TEST_STREAM_NAME);
    await pageObjects.streams.closeAttachmentDetailsFlyout();

    // Unlink all attachments at the end
    await pageObjects.streams.selectAllAttachmentsInTable();
    await pageObjects.streams.clickSelectedAttachmentsLink();
    await pageObjects.streams.clickRemoveAttachmentsInPopover();
    await pageObjects.streams.confirmRemoveAttachments();
    await pageObjects.streams.expectAttachmentsEmptyPromptVisible();
  });
});
