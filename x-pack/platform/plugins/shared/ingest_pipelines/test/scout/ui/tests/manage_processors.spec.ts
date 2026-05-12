/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Ingest pipelines Manage Processors', { tag: tags.stateful.classic }, () => {
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

  test('creates MaxMind and IPinfo databases and deletes them', async ({ pageObjects }) => {
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
    await expect(pageObjects.ingestPipelines.geoipEmptyListPrompt).toBeVisible();
  });
});
