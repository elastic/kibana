/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../../../fixtures';
import {
  closeToastsIfPresent,
  setStreamDslLifecycle,
} from '../../../fixtures/data_lifecycle_helpers';

// Frozen phase is a stateful-only feature — serverless does not support the frozen tier.
test.describe('Stream data retention - frozen phase', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.streams.clearStreamChildren('logs.otel');
    await setStreamDslLifecycle(apiServices.streams, 'logs.otel', {});
    await apiServices.streams.forkStream('logs.otel', 'logs.otel.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ page }) => {
    await closeToastsIfPresent(page);
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.clearStreamChildren('logs.otel');
  });

  test('should show frozen phase bar when frozen_after is configured', async ({
    page,
    apiServices,
    pageObjects,
  }) => {
    await setStreamDslLifecycle(apiServices.streams, 'logs.otel.nginx', { frozen_after: '10d' });
    await pageObjects.streams.gotoDataRetentionTab('logs.otel.nginx');

    await expect(page.getByTestId('lifecyclePhase-Frozen-button')).toBeVisible();
  });

  test('should show 3 data phases subtitle when frozen_after and data_retention are both set', async ({
    page,
    apiServices,
    pageObjects,
  }) => {
    await setStreamDslLifecycle(apiServices.streams, 'logs.otel.nginx', {
      frozen_after: '10d',
      data_retention: '30d',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.otel.nginx');

    await expect(page.getByTestId('retention-metric-subtitle')).toContainText('3 data phases');
  });

  test('should open frozen phase popover when frozen phase button is clicked', async ({
    page,
    apiServices,
    pageObjects,
  }) => {
    await setStreamDslLifecycle(apiServices.streams, 'logs.otel.nginx', { frozen_after: '10d' });
    await pageObjects.streams.gotoDataRetentionTab('logs.otel.nginx');

    await page.getByTestId('lifecyclePhase-Frozen-button').click();
    await expect(page.getByTestId('lifecyclePhase-Frozen-popoverTitle')).toBeVisible();
  });
});
