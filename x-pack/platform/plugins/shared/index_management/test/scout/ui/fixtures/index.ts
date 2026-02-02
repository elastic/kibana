/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type {
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  BrowserAuthFixture,
} from '@kbn/scout';
import type { PageObjects } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import type { AbstractPageObject } from './page_objects/index_management_page';
import { IndexManagement } from './page_objects/index_management_page';
import { CUSTOM_ROLES } from './custom_roles';

type PageObjectClass = new (page: ScoutPage) => AbstractPageObject;

export interface IndexManagementBrowserAuthFixture extends BrowserAuthFixture {
  loginAsIndexManagementUser: () => Promise<void>;
}

export const createTest = function <PageObjectsExtensions = Record<string, AbstractPageObject>>(
  pageObjectClassMap: Record<string, PageObjectClass>
) {
  type PageObjectsExtended = PageObjectsExtensions & PageObjects;

  function extendPOs(pageObjects: PageObjects, page: ScoutPage): PageObjectsExtended {
    const initedLazyPageObjects = Object.keys(pageObjectClassMap).reduce<
      Record<string, AbstractPageObject>
    >((col, value) => {
      col[value] = createLazyPageObject(pageObjectClassMap[value], page);
      return col;
    }, {});

    return {
      ...initedLazyPageObjects,
      ...pageObjects,
    } as PageObjectsExtended;
  }

  return base.extend<
    ScoutTestFixtures & {
      pageObjects: PageObjectsExtended;
    },
    ScoutWorkerFixtures & {
      browserAuth: IndexManagementBrowserAuthFixture;
    }
  >({
    pageObjects: async (
      {
        pageObjects,
        page,
      }: {
        pageObjects: PageObjectsExtended;
        page: ScoutPage;
      },
      use: (pageObjects: PageObjectsExtended) => Promise<void>
    ) => {
      const extendedPageObjects = extendPOs(pageObjects, page);
      await use(extendedPageObjects);
    },
    browserAuth: async (
      { browserAuth }: { browserAuth: BrowserAuthFixture },
      use: (browserAuth: IndexManagementBrowserAuthFixture) => Promise<void>
    ) => {
      const loginAsIndexManagementUser = async () =>
        browserAuth.loginWithCustomRole(CUSTOM_ROLES.indexManagementUser);

      await use({
        ...browserAuth,
        loginAsIndexManagementUser,
      });
    },
  });
};

export const test = createTest<{ indexManagement: IndexManagement }>({
  indexManagement: IndexManagement,
});
