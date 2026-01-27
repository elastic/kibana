/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';

/**
 * These tests verify the visual styling of partitioning panels as per the Chrome UI design update.
 * - Routing rule panels should have "subdued" background color
 * - Condition panels inside routing rules should have "plain" background color
 * - Current stream entry panel should have "subdued" background color
 *
 * See: https://github.com/elastic/observability-design/issues/528
 */
test.describe('Stream data routing - panel colors', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing rules and create a test stream
    await apiServices.streams.clearStreamChildren('logs');
    await apiServices.streams.forkStream('logs', 'logs.panel-color-test', {
      field: 'service.name',
      eq: 'test-service',
    });

    await pageObjects.streams.gotoPartitioningTab('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.clearStreamChildren('logs');
  });

  test('should render routing rule panels with subdued background color', async ({ page }) => {
    // Verify the idle routing rule panel has subdued color
    const routingRulePanel = page.getByTestId('routingRule-logs.panel-color-test');
    await expect(routingRulePanel).toBeVisible();

    // EuiPanel with color="subdued" has the class euiPanel--subdued
    await expect(routingRulePanel).toHaveClass(/euiPanel--subdued/);
  });

  test('should render condition panels with plain background color', async ({ page }) => {
    // The condition panel is inside the routing rule
    const routingRulePanel = page.getByTestId('routingRule-logs.panel-color-test');
    await expect(routingRulePanel).toBeVisible();

    // The condition panel inside should have plain color (euiPanel--plain)
    // We look for the inner panel within the routing rule
    const conditionPanel = routingRulePanel.locator('.euiPanel--plain');
    await expect(conditionPanel).toBeVisible();
  });

  test('should render new routing rule panel with subdued background when creating', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickCreateRoutingRule();

    // Verify the new routing rule entry field is visible
    await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();

    // The panel containing the new rule form should have subdued color
    // Find the panel that contains the name input field
    const newRulePanel = page.locator('.euiPanel--subdued').filter({
      has: page.getByTestId('streamsAppRoutingStreamEntryNameField'),
    });
    await expect(newRulePanel).toBeVisible();

    await pageObjects.streams.cancelRoutingRule();
  });

  test('should render edit routing rule panel with subdued background when editing', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.clickEditRoutingRule('logs.panel-color-test');

    // Verify we're in edit mode
    const editingPanel = page.getByTestId('routingRule-logs.panel-color-test');
    await expect(editingPanel).toBeVisible();
    await expect(editingPanel).toHaveClass(/euiPanel--subdued/);

    await pageObjects.streams.cancelRoutingRule();
  });
});
