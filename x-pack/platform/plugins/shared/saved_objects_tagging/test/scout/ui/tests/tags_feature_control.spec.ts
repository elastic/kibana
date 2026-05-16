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

interface TestTitles {
  view: string;
  delete: string;
  bulkDelete: string;
  create: string;
  edit: string;
  viewRelations: string;
}

interface FeatureControlRoleSuite {
  role: KibanaRole;
  privileges: PrivilegeMap;
  titles: TestTitles;
}

const FEATURE_CONTROL_ROLE_SUITES: FeatureControlRoleSuite[] = [
  {
    role: getSavedObjectsTaggingReadRole(),
    privileges: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      viewRelations: false,
    },
    titles: {
      view: 'read role can see all tags',
      delete: 'read role cannot delete a tag',
      bulkDelete: 'read role cannot bulk delete tags',
      create: 'read role cannot create a tag',
      edit: 'read role cannot edit a tag',
      viewRelations: 'read role cannot see tag relations',
    },
  },
  {
    role: getSavedObjectsTaggingWriteRole(),
    privileges: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      viewRelations: false,
    },
    titles: {
      view: 'write role can see all tags',
      delete: 'write role can delete a tag',
      bulkDelete: 'write role can bulk delete tags',
      create: 'write role can create a tag',
      edit: 'write role can edit a tag',
      viewRelations: 'write role cannot see tag relations',
    },
  },
  {
    role: getSavedObjectsTaggingReadWithSavedObjectsManagementReadRole(),
    privileges: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      viewRelations: true,
    },
    titles: {
      view: 'read + so management read role can see all tags',
      delete: 'read + so management read role cannot delete a tag',
      bulkDelete: 'read + so management read role cannot bulk delete tags',
      create: 'read + so management read role cannot create a tag',
      edit: 'read + so management read role cannot edit a tag',
      viewRelations: 'read + so management read role can see tag relations',
    },
  },
  {
    role: getDefaultSpaceWriteRole(),
    privileges: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      viewRelations: true,
    },
    titles: {
      view: 'base write role can see all tags',
      delete: 'base write role can delete a tag',
      bulkDelete: 'base write role can bulk delete tags',
      create: 'base write role can create a tag',
      edit: 'base write role can edit a tag',
      viewRelations: 'base write role can see tag relations',
    },
  },
];

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
  test.beforeAll(async ({ kbnClient }) => {
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
    test(suite.titles.view, async ({ browserAuth, page, kbnUrl, pageObjects }) => {
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

    test(suite.titles.delete, async ({ browserAuth, page, kbnUrl, pageObjects }) => {
      await loginAndOpenTagsPage({
        role: suite.role,
        browserAuth,
        page,
        kbnUrl,
        tagsTable: pageObjects.tagManagement.tagsTable,
      });

      const canDelete = await pageObjects.tagManagement.tagsTable.isRowActionAvailable(
        'delete',
        'tag-1'
      );
      expect(canDelete).toBe(suite.privileges.delete);
    });

    test(suite.titles.bulkDelete, async ({ browserAuth, page, kbnUrl, pageObjects }) => {
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

    test(suite.titles.create, async ({ browserAuth, page, kbnUrl, pageObjects }) => {
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

    test(suite.titles.edit, async ({ browserAuth, page, kbnUrl, pageObjects }) => {
      await loginAndOpenTagsPage({
        role: suite.role,
        browserAuth,
        page,
        kbnUrl,
        tagsTable: pageObjects.tagManagement.tagsTable,
      });

      const canEdit = await pageObjects.tagManagement.tagsTable.isRowActionAvailable(
        'edit',
        'tag-1'
      );
      expect(canEdit).toBe(suite.privileges.edit);
    });

    test(suite.titles.viewRelations, async ({ browserAuth, page, kbnUrl, pageObjects }) => {
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
