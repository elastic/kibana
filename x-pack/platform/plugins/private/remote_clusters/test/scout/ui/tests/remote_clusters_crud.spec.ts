/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData, removeCluster, expectNoA11yViolations } from '../fixtures';

const { REMOTE_CLUSTERS_ADMIN_ROLE } = testData;

const CLUSTER_NAME = 'testName';
// Scout's local stateful env renders the Cloud (proxy-address) add-form, so the
// cluster is added by remote address rather than sniff seeds.
const CLUSTER_ADDRESS = 'test:9400';

// Local stateful only: the Remote Clusters UI is disabled on serverless.
test.describe('Remote Clusters - add cluster', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
    // Remove our own cluster left by a crashed/interrupted run so adding it can't hit a conflict.
    await removeCluster(esClient, CLUSTER_NAME);
    await browserAuth.loginWithCustomRole(REMOTE_CLUSTERS_ADMIN_ROLE);
    await pageObjects.remoteClusters.goto();
  });

  test.afterEach(async ({ esClient }) => {
    await removeCluster(esClient, CLUSTER_NAME);
  });

  test('walks the add-cluster wizard and shows the new cluster, accessible at each step', async ({
    page,
    pageObjects,
  }) => {
    const { remoteClusters } = pageObjects;

    await test.step('remote clusters landing page', async () => {
      // Not the empty-state prompt specifically: another suite may have a remote on the shared
      // cluster, so the populated list can render instead. Assert the entry point and scan a11y.
      await expect(remoteClusters.createButton).toBeVisible();
      await expectNoA11yViolations(page);
    });

    await test.step('trust step', async () => {
      await remoteClusters.startAddWizard();
      await expect(remoteClusters.pageTitle).toHaveText('Add remote cluster');
      await expectNoA11yViolations(page);
    });

    await test.step('connection form step', async () => {
      await remoteClusters.completeTrustStepWithCert();
      await expect(remoteClusters.formNextButton).toBeVisible();
      await expectNoA11yViolations(page);
    });

    await test.step('request flyout', async () => {
      await remoteClusters.openRequestFlyout();
      await expect(remoteClusters.requestFlyoutTitle).toHaveText('Request');
      await expectNoA11yViolations(page);
      await remoteClusters.closeFlyout();
    });

    await test.step('review step', async () => {
      await remoteClusters.fillForm(CLUSTER_NAME, CLUSTER_ADDRESS);
      await remoteClusters.goToReviewStep();
      await expect(remoteClusters.reviewNextButton).toBeVisible();
      await expectNoA11yViolations(page);
    });

    await test.step('submit and view details', async () => {
      await remoteClusters.submit();
      await expect(remoteClusters.detailsFlyoutTitle).toHaveText(CLUSTER_NAME);
      await expect(remoteClusters.detailsProxyAddress).toHaveText(CLUSTER_ADDRESS);
    });
  });
});
