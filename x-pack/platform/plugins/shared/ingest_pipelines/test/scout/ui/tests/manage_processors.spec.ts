/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutWorkerFixtures } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Ingest pipelines Manage Processors', { tag: tags.stateful.classic }, () => {
  // Poll ES directly until neither of our GeoIP databases exists. This absorbs the
  // read-after-write lag between a UI/API delete and the cluster settling to zero
  // databases (at which point ES starts returning 404 for the list endpoint). The
  // geoipEmptyListPrompt only renders when the UI's first GET returns an empty array,
  // so we must confirm the cleared state before loading the page.
  const expectDatabasesCleared = async (esClient: ScoutWorkerFixtures['esClient']) => {
    await expect
      .poll(async () => {
        try {
          const { databases } = (await esClient.ingest.getGeoipDatabase()) as {
            databases: Array<{ id: string }>;
          };
          const ids = databases.map((d) => d.id);
          return [testData.MAXMIND_DATABASE_ID, testData.IPINFO_DATABASE_ID].some((id) =>
            ids.includes(id)
          );
        } catch {
          // ES returns 404 when there are no databases — none of ours remain
          return false;
        }
      })
      .toBe(false);
  };

  test.beforeAll(async ({ esClient, log }) => {
    for (const databaseId of [testData.MAXMIND_DATABASE_ID, testData.IPINFO_DATABASE_ID]) {
      try {
        await esClient.ingest.deleteGeoipDatabase({ id: databaseId });
      } catch (error) {
        log.debug(
          `GeoIP database pre-cleanup skipped for ${databaseId}: ${(error as Error).message}`
        );
      }
    }
    // Wait for ES to settle before the first page load, so the empty-prompt test
    // doesn't race a stale list entry.
    await expectDatabasesCleared(esClient);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsManageProcessorsUser();
    await pageObjects.ingestPipelines.goto();
    await pageObjects.ingestPipelines.navigateToManageProcessorsPage();
  });

  test.afterAll(async ({ esClient, log }) => {
    for (const databaseId of [testData.MAXMIND_DATABASE_ID, testData.IPINFO_DATABASE_ID]) {
      try {
        await esClient.ingest.deleteGeoipDatabase({ id: databaseId });
      } catch (error) {
        log.debug(`GeoIP database cleanup failed for ${databaseId}: ${(error as Error).message}`);
      }
    }
  });

  test('shows the empty list prompt', async ({ pageObjects }) => {
    await expect(pageObjects.ingestPipelines.geoipEmptyListPrompt).toBeVisible();
  });

  test('creates MaxMind and IPinfo databases and deletes them', async ({
    pageObjects,
    esClient,
  }) => {
    await pageObjects.ingestPipelines.openCreateDatabaseModal();
    await pageObjects.ingestPipelines.fillAddDatabaseForm(
      'maxmind',
      testData.MAXMIND_DATABASE_NAME,
      '123456'
    );
    await pageObjects.ingestPipelines.clickAddDatabaseButton();

    await expect
      .poll(async () => await pageObjects.ingestPipelines.getGeoipDatabases())
      .toContainEqual(expect.stringContaining(testData.MAXMIND_DATABASE_NAME));

    await pageObjects.ingestPipelines.openCreateDatabaseModal();
    await pageObjects.ingestPipelines.fillAddDatabaseForm('ipinfo', 'asn');
    await pageObjects.ingestPipelines.clickAddDatabaseButton();

    await expect
      .poll(async () => await pageObjects.ingestPipelines.getGeoipDatabases())
      .toContainEqual(expect.stringContaining(testData.IPINFO_DATABASE_NAME));

    const databaseRows = await pageObjects.ingestPipelines.getGeoipDatabases();
    const maxMindDatabaseRow = databaseRows.find((database) =>
      database.includes(testData.MAXMIND_DATABASE_NAME)
    );
    const ipInfoDatabaseRow = databaseRows.find((database) =>
      database.includes(testData.IPINFO_DATABASE_NAME)
    );

    expect(maxMindDatabaseRow).toContain(testData.MAXMIND_DATABASE_NAME);
    expect(maxMindDatabaseRow).toContain('MaxMind');
    expect(ipInfoDatabaseRow).toContain(testData.IPINFO_DATABASE_NAME);
    expect(ipInfoDatabaseRow).toContain('IPinfo');

    await pageObjects.ingestPipelines.deleteDatabaseByName(testData.MAXMIND_DATABASE_NAME);
    await pageObjects.ingestPipelines.deleteDatabaseByName(testData.IPINFO_DATABASE_NAME);

    // The UI fetches the database list once on mount and only re-fetches on explicit
    // user actions. After the deletes above the modal fires a single resendRequest, but
    // ES can still serve a stale entry for a brief window. Poll ES to confirm the cluster
    // has settled, then navigate fresh so the next useLoadDatabases GET is guaranteed
    // to return [].
    await expectDatabasesCleared(esClient);
    await pageObjects.ingestPipelines.goto();
    await pageObjects.ingestPipelines.navigateToManageProcessorsPage();
    await expect(pageObjects.ingestPipelines.geoipEmptyListPrompt).toBeVisible();
  });
});
