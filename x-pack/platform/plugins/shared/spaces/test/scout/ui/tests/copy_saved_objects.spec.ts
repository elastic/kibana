/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const DEFAULT_SPACE_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/spaces/copy_saved_objects_default_space.json';
const SALES_SPACE_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/spaces/copy_saved_objects_sales_space.json';

const MARKETING = 'marketing';
const SALES = 'sales';

test.describe('Copy Saved Objects to Space', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await apiServices.spaces.create({ id: MARKETING, name: 'Marketing' });
    await apiServices.spaces.create({ id: SALES, name: 'Sales' });

    await Promise.all([
      kbnClient.importExport.load(DEFAULT_SPACE_ARCHIVE),
      kbnClient.importExport.load(SALES_SPACE_ARCHIVE, { space: SALES }),
    ]);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.savedObjectsManagement.gotoListing();
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await Promise.all([
      kbnClient.savedObjects.cleanStandardList(),
      kbnClient.savedObjects.cleanStandardList({ space: SALES }),
    ]);
    await apiServices.spaces.delete(SALES);
    await apiServices.spaces.delete(MARKETING);
  });

  test('copies a dashboard to the marketing space, with all references', async ({
    pageObjects,
  }) => {
    const { savedObjectsManagement, copySavedObjectsToSpaceFlyout } = pageObjects;

    await savedObjectsManagement.searchFor('A Dashboard');
    await savedObjectsManagement.clickCopyToSpaceByTitle('A Dashboard');
    await copySavedObjectsToSpaceFlyout.waitForOpen();

    await copySavedObjectsToSpaceFlyout.setupForm({
      createNewCopies: false,
      overwrite: true,
      destinationSpaceId: MARKETING,
    });
    await copySavedObjectsToSpaceFlyout.startCopy();
    await copySavedObjectsToSpaceFlyout.waitForCopyToFinish(MARKETING);

    expect(await copySavedObjectsToSpaceFlyout.getSummaryCounts()).toStrictEqual({
      success: 3,
      pending: 0,
      skipped: 0,
      errors: 0,
    });

    await copySavedObjectsToSpaceFlyout.finishCopy();
  });

  test('allows conflicts to be resolved', async ({ pageObjects }) => {
    const { savedObjectsManagement, copySavedObjectsToSpaceFlyout } = pageObjects;

    await savedObjectsManagement.searchFor('A Dashboard');
    await savedObjectsManagement.clickCopyToSpaceByTitle('A Dashboard');
    await copySavedObjectsToSpaceFlyout.waitForOpen();

    await copySavedObjectsToSpaceFlyout.setupForm({
      createNewCopies: false,
      overwrite: false,
      destinationSpaceId: SALES,
    });
    await copySavedObjectsToSpaceFlyout.startCopy();
    await copySavedObjectsToSpaceFlyout.waitForConflicts(SALES);

    expect(await copySavedObjectsToSpaceFlyout.getSummaryCounts()).toStrictEqual({
      success: 0,
      pending: 2,
      skipped: 1,
      errors: 0,
    });

    // Mark the conflicting index pattern for overwrite.
    await copySavedObjectsToSpaceFlyout.resolveConflictByOverwrite(
      SALES,
      'index-pattern:logstash-*'
    );

    await expect
      .poll(async () => await copySavedObjectsToSpaceFlyout.getSummaryCounts())
      .toStrictEqual({ success: 0, pending: 3, skipped: 0, errors: 0 });

    await copySavedObjectsToSpaceFlyout.finishCopy();
  });

  test('avoids conflicts when createNewCopies is enabled', async ({ pageObjects }) => {
    const { savedObjectsManagement, copySavedObjectsToSpaceFlyout } = pageObjects;

    await savedObjectsManagement.searchFor('A Dashboard');
    await savedObjectsManagement.clickCopyToSpaceByTitle('A Dashboard');
    await copySavedObjectsToSpaceFlyout.waitForOpen();

    await copySavedObjectsToSpaceFlyout.setupForm({
      createNewCopies: true,
      overwrite: false,
      destinationSpaceId: SALES,
    });
    await copySavedObjectsToSpaceFlyout.startCopy();
    await copySavedObjectsToSpaceFlyout.waitForCopyToFinish(SALES);

    expect(await copySavedObjectsToSpaceFlyout.getSummaryCounts()).toStrictEqual({
      success: 3,
      pending: 0,
      skipped: 0,
      errors: 0,
    });

    await copySavedObjectsToSpaceFlyout.finishCopy();
  });

  test('copies a dashboard to the marketing space, with circular references', async ({
    pageObjects,
  }) => {
    const { savedObjectsManagement, copySavedObjectsToSpaceFlyout } = pageObjects;

    await savedObjectsManagement.searchFor('Dashboard Foo');
    await savedObjectsManagement.clickCopyToSpaceByTitle('Dashboard Foo');
    await copySavedObjectsToSpaceFlyout.waitForOpen();

    await copySavedObjectsToSpaceFlyout.setupForm({
      createNewCopies: false,
      overwrite: true,
      destinationSpaceId: MARKETING,
    });
    await copySavedObjectsToSpaceFlyout.startCopy();
    await copySavedObjectsToSpaceFlyout.waitForCopyToFinish(MARKETING);

    expect(await copySavedObjectsToSpaceFlyout.getSummaryCounts()).toStrictEqual({
      success: 2,
      pending: 0,
      skipped: 0,
      errors: 0,
    });

    await copySavedObjectsToSpaceFlyout.finishCopy();
  });
});
