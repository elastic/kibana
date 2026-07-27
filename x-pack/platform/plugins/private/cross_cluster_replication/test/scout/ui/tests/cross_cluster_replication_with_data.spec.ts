/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Runs stateful classic only: CCR is not available on Cloud deployments.
//
// Restores the "with data" accessibility scenarios from the deleted CCR a11y FTR
// (follower index table + detail flyout, auto-follow pattern table + detail
// flyout) by provisioning real CCR resources through the Elasticsearch client.
// A self-referential remote cluster (the test node pointing at its own transport
// address) is used, mirroring the original FTR's `localhost:9300` seed.

import type { EsClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CUSTOM_ROLES } from '../fixtures';

const REMOTE_CLUSTER = 'ccr-scout-remote';
const LEADER_INDEX = 'ccr-scout-leader';
const FOLLOWER_INDEX = 'ccr-scout-follower';
const AUTO_FOLLOW_PATTERN = 'ccr-scout-auto-follow';
// Intentionally does not match LEADER_INDEX so the pattern doesn't auto-create a
// competing follower for our manually-followed index.
const AUTO_FOLLOW_LEADER_PATTERNS = ['ccr-scout-auto-leader-*'];

// EuiFlyout renders in a portal outside `.kbnAppWrapper`, so both selectors are
// required to catch a11y violations inside the detail flyouts.
const A11Y_INCLUDE = ['.kbnAppWrapper'];
const A11Y_INCLUDE_WITH_FLYOUT = ['.kbnAppWrapper', '[data-euiportal="true"]'];

const resolveTransportSeed = async (esClient: EsClient): Promise<string> => {
  const info = await esClient.nodes.info({
    node_id: '_local',
    filter_path: ['nodes.*.transport.publish_address'],
  });
  const node = Object.values(info.nodes ?? {})[0];
  const publishAddress = node?.transport?.publish_address;
  if (!publishAddress) {
    throw new Error('Unable to resolve the Elasticsearch transport publish address');
  }
  // Older ES versions format this as `hostname/ip:port`; keep only `ip:port`.
  return publishAddress.includes('/') ? publishAddress.split('/').slice(-1)[0] : publishAddress;
};

const waitForRemoteConnected = async (esClient: EsClient, name: string): Promise<void> => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const remoteInfo = await esClient.cluster.remoteInfo();
    if (remoteInfo[name]?.connected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Remote cluster '${name}' did not connect within the timeout`);
};

const cleanupCcrResources = async (esClient: EsClient): Promise<void> => {
  // Best-effort teardown; each step is independent so a missing resource on a
  // clean cluster (or after a mid-test failure) does not abort the rest.
  try {
    await esClient.ccr.deleteAutoFollowPattern({ name: AUTO_FOLLOW_PATTERN });
  } catch {
    // Pattern was never created or already deleted.
  }
  try {
    await esClient.ccr.pauseFollow({ index: FOLLOWER_INDEX });
    await esClient.indices.close({ index: FOLLOWER_INDEX });
    await esClient.ccr.unfollow({ index: FOLLOWER_INDEX });
  } catch {
    // Follower was never created or already converted to a regular index.
  }
  try {
    await esClient.indices.delete({ index: [FOLLOWER_INDEX, LEADER_INDEX] });
  } catch {
    // Indices were never created or already deleted.
  }
  try {
    await esClient.cluster.putSettings({
      persistent: { cluster: { remote: { [REMOTE_CLUSTER]: { seeds: null } } } },
    });
  } catch {
    // Remote cluster setting was never applied.
  }
};

test.describe('Cross-Cluster Replication - with data', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await cleanupCcrResources(esClient);

    const seed = await resolveTransportSeed(esClient);
    await esClient.cluster.putSettings({
      persistent: { cluster: { remote: { [REMOTE_CLUSTER]: { seeds: [seed] } } } },
    });
    await waitForRemoteConnected(esClient, REMOTE_CLUSTER);

    await esClient.indices.create({ index: LEADER_INDEX });
    await esClient.ccr.follow({
      index: FOLLOWER_INDEX,
      remote_cluster: REMOTE_CLUSTER,
      leader_index: LEADER_INDEX,
      wait_for_active_shards: 1,
    });
    await esClient.ccr.putAutoFollowPattern({
      name: AUTO_FOLLOW_PATTERN,
      remote_cluster: REMOTE_CLUSTER,
      leader_index_patterns: AUTO_FOLLOW_LEADER_PATTERNS,
      follow_index_pattern: '{{leader_index}}-follower',
    });
  });

  test.afterAll(async ({ esClient }) => {
    await cleanupCcrResources(esClient);
  });

  test('follower index and auto-follow pattern data views are accessible', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_ccr_role);

    await test.step('follower indices table lists the follower index', async () => {
      await pageObjects.crossClusterReplication.gotoFollowerIndicesList();
      await expect(
        pageObjects.crossClusterReplication.followerIndexLink(FOLLOWER_INDEX)
      ).toBeVisible();
      const { violations } = await page.checkA11y({ include: A11Y_INCLUDE });
      expect(violations).toStrictEqual([]);
    });

    await test.step('follower index detail flyout is accessible', async () => {
      await pageObjects.crossClusterReplication.openFollowerIndexDetail(FOLLOWER_INDEX);
      await expect(pageObjects.crossClusterReplication.followerIndexDetailFlyout).toContainText(
        FOLLOWER_INDEX
      );
      const { violations } = await page.checkA11y({ include: A11Y_INCLUDE_WITH_FLYOUT });
      expect(violations).toStrictEqual([]);
      await pageObjects.crossClusterReplication.closeFlyout();
    });

    await test.step('auto-follow patterns table lists the pattern', async () => {
      await pageObjects.crossClusterReplication.gotoAutoFollowPatternsList();
      await expect(
        pageObjects.crossClusterReplication.autoFollowPatternLink(AUTO_FOLLOW_PATTERN)
      ).toBeVisible();
      const { violations } = await page.checkA11y({ include: A11Y_INCLUDE });
      expect(violations).toStrictEqual([]);
    });

    await test.step('auto-follow pattern detail flyout is accessible', async () => {
      await pageObjects.crossClusterReplication.openAutoFollowPatternDetail(AUTO_FOLLOW_PATTERN);
      await expect(pageObjects.crossClusterReplication.autoFollowPatternDetailFlyout).toContainText(
        AUTO_FOLLOW_PATTERN
      );
      const { violations } = await page.checkA11y({ include: A11Y_INCLUDE_WITH_FLYOUT });
      expect(violations).toStrictEqual([]);
      await pageObjects.crossClusterReplication.closeFlyout();
    });
  });
});
