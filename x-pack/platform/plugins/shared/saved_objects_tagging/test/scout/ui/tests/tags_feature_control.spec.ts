/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { KBN_ARCHIVES, test } from '../fixtures';
import type { TagsTable } from '../fixtures/page_objects/tags_table';
import {
  getDefaultSpaceWriteRole,
  getNoSavedObjectsTaggingAccessRole,
  getSavedObjectsTaggingReadRole,
  getSavedObjectsTaggingReadWithSavedObjectsManagementReadRole,
  getSavedObjectsTaggingWriteRole,
} from '../fixtures/services/privileges';

interface PrivilegeMap {
  view: boolean;
  delete: boolean;
  create: boolean;
  edit: boolean;
  viewRelations: boolean;
}

interface FeatureControlRoleSuite {
  role: KibanaRole;
  description: string;
  privileges: PrivilegeMap;
}

const FEATURE_CONTROL_ROLE_SUITES: FeatureControlRoleSuite[] = [
  {
    role: getSavedObjectsTaggingReadRole(),
    description: 'tag management read privileges',
    privileges: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      viewRelations: false,
    },
  },
  {
    role: getSavedObjectsTaggingWriteRole(),
    description: 'tag management write privileges',
    privileges: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      viewRelations: false,
    },
  },
  {
    role: getSavedObjectsTaggingReadWithSavedObjectsManagementReadRole(),
    description: 'tag management read and so management read privileges',
    privileges: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      viewRelations: true,
    },
  },
  {
    role: getDefaultSpaceWriteRole(),
    description: 'base write privileges',
    privileges: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      viewRelations: true,
    },
  },
];

const canOrCannot = (allowed: boolean) => (allowed ? 'can' : "can't");

const selectSomeTagsIfPossible = async (tagsTable: TagsTable) => {
  if (await tagsTable.isSelectionColumnVisible()) {
    await tagsTable.selectTagByName('tag-1');
    await tagsTable.selectTagByName('tag-3');
  }
};

const loginAndOpenTagsPage = async ({
  role,
  browserAuth,
  page,
  kbnUrl,
  tagsTable,
}: {
  role: KibanaRole;
  browserAuth: { loginWithCustomRole: (role: KibanaRole) => Promise<void> };
  page: ScoutPage;
  kbnUrl: { app: (path: string) => string };
  tagsTable: TagsTable;
}) => {
  await browserAuth.loginWithCustomRole(role);
  await page.goto(kbnUrl.app('management/kibana/tags'));
  await tagsTable.waitForLoaded();
};

// custom-role login is not supported in ECH yet, so this suite runs on local
// stateful only.
test.describe('Tags management feature controls', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.FUNCTIONAL_BASE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('no saved objects tagging privileges cannot access tags page', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(getNoSavedObjectsTaggingAccessRole());
    await page.goto(kbnUrl.app('management/kibana/tags'));
    await expect(page.testSubj.locator('appNotFoundPageContent')).toBeVisible();
  });

  for (const suite of FEATURE_CONTROL_ROLE_SUITES) {
    test(`${suite.description} - ${canOrCannot(suite.privileges.view)} see all tags`, async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects,
    }) => {
      await loginAndOpenTagsPage({
        role: suite.role,
        browserAuth,
        page,
        kbnUrl,
        tagsTable: pageObjects.tagManagement.tagsTable,
      });

      const tagNames = await pageObjects.tagManagement.tagsTable.getDisplayedTagNames();
      expect(tagNames).toHaveLength(suite.privileges.view ? 5 : 0);
    });

    test(`${suite.description} - ${canOrCannot(suite.privileges.delete)} delete tag`, async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects,
    }) => {
      await loginAndOpenTagsPage({
        role: suite.role,
        browserAuth,
        page,
        kbnUrl,
        tagsTable: pageObjects.tagManagement.tagsTable,
      });

      const canDelete = await pageObjects.tagManagement.tagsTable.isRowActionAvailable('delete');
      expect(canDelete).toBe(suite.privileges.delete);
    });

    test(`${suite.description} - ${canOrCannot(suite.privileges.delete)} bulk delete tags`, async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects,
    }) => {
      await loginAndOpenTagsPage({
        role: suite.role,
        browserAuth,
        page,
        kbnUrl,
        tagsTable: pageObjects.tagManagement.tagsTable,
      });

      const { tagsTable } = pageObjects.tagManagement;
      await selectSomeTagsIfPossible(tagsTable);

      const canBulkDelete = await tagsTable.isBulkActionPresent('delete');
      expect(canBulkDelete).toBe(suite.privileges.delete);
    });

    test(`${suite.description} - ${canOrCannot(suite.privileges.create)} create tag`, async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects,
    }) => {
      await loginAndOpenTagsPage({
        role: suite.role,
        browserAuth,
        page,
        kbnUrl,
        tagsTable: pageObjects.tagManagement.tagsTable,
      });

      await expect(page.testSubj.locator('createTagButton')).toHaveCount(
        suite.privileges.create ? 1 : 0
      );
    });

    test(`${suite.description} - ${canOrCannot(suite.privileges.edit)} edit tag`, async ({
      browserAuth,
      page,
      kbnUrl,
      pageObjects,
    }) => {
      await loginAndOpenTagsPage({
        role: suite.role,
        browserAuth,
        page,
        kbnUrl,
        tagsTable: pageObjects.tagManagement.tagsTable,
      });

      const canEdit = await pageObjects.tagManagement.tagsTable.isRowActionAvailable('edit');
      expect(canEdit).toBe(suite.privileges.edit);
    });

    test(`${suite.description} - ${canOrCannot(
      suite.privileges.viewRelations
    )} see relations to other objects`, async ({ browserAuth, page, kbnUrl, pageObjects }) => {
      await loginAndOpenTagsPage({
        role: suite.role,
        browserAuth,
        page,
        kbnUrl,
        tagsTable: pageObjects.tagManagement.tagsTable,
      });

      const tagInfo = await pageObjects.tagManagement.tagsTable.getDisplayedTagInfo('tag-1');
      const hasRelationsLink = tagInfo?.connectionCount !== undefined;
      expect(hasRelationsLink).toBe(suite.privileges.viewRelations);
    });
  }
});
