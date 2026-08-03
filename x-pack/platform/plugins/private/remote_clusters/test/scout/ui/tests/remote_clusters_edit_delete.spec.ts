/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData, seedSniffCluster, seedProxyCluster, removeCluster } from '../fixtures';
import type { RemoteClustersPage } from '../fixtures/page_objects/remote_clusters_page';

const { REMOTE_CLUSTERS_ADMIN_ROLE, A11Y_SELECTORS, SNIFF_CLUSTER_NAME, PROXY_CLUSTER_NAME } =
  testData;

const runEditDeleteJourney = async (
  page: ScoutPage,
  remoteClusters: RemoteClustersPage,
  clusterName: string
) => {
  const expectNoA11yViolations = async () => {
    const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
    expect(violations).toStrictEqual([]);
  };

  await test.step('list view shows the remote cluster', async () => {
    await expect(remoteClusters.clusterLink(clusterName)).toBeVisible();
    await expectNoA11yViolations();
  });

  await test.step('details flyout', async () => {
    await remoteClusters.openClusterDetails(clusterName);
    await expect(remoteClusters.detailsFlyoutTitle).toHaveText(clusterName);
    await expectNoA11yViolations();
    await remoteClusters.closeFlyout();
  });

  await test.step('delete confirmation modal', async () => {
    await remoteClusters.openDeleteModal(clusterName);
    await expect(remoteClusters.deleteModalTitle).toHaveText(
      `Remove remote cluster '${clusterName}'?`
    );
    await expectNoA11yViolations();
    await remoteClusters.cancelDeleteModal();
  });

  await test.step('edit form and request flyout', async () => {
    await remoteClusters.openEditForm(clusterName);
    await expect(remoteClusters.pageTitle).toHaveText('Edit remote cluster');
    await remoteClusters.openRequestFlyout();
    await expect(remoteClusters.requestFlyoutTitle).toHaveText(`Request for '${clusterName}'`);
    await expectNoA11yViolations();
  });
};

// Local stateful only: the Remote Clusters UI is disabled on serverless.
test.describe('Remote Clusters - edit and delete', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeEach(async ({ browserAuth, esClient }) => {
    // Clear leftovers from a crashed/interrupted run before seeding this test's cluster.
    await removeCluster(esClient, SNIFF_CLUSTER_NAME);
    await removeCluster(esClient, PROXY_CLUSTER_NAME);
    await browserAuth.loginWithCustomRole(REMOTE_CLUSTERS_ADMIN_ROLE);
  });

  test.afterEach(async ({ esClient }) => {
    await removeCluster(esClient, SNIFF_CLUSTER_NAME);
    await removeCluster(esClient, PROXY_CLUSTER_NAME);
  });

  test('sniff-mode cluster: list, details, delete modal, edit', async ({
    page,
    esClient,
    pageObjects,
  }) => {
    await seedSniffCluster(esClient, SNIFF_CLUSTER_NAME);
    await pageObjects.remoteClusters.goto();
    await runEditDeleteJourney(page, pageObjects.remoteClusters, SNIFF_CLUSTER_NAME);
  });

  test('proxy-mode cluster: list, details, delete modal, edit', async ({
    page,
    esClient,
    pageObjects,
  }) => {
    await seedProxyCluster(esClient, PROXY_CLUSTER_NAME);
    await pageObjects.remoteClusters.goto();
    await runEditDeleteJourney(page, pageObjects.remoteClusters, PROXY_CLUSTER_NAME);
  });
});
