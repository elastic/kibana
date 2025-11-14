/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import type { PageObjects } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import type { AbstractPageObject } from './page_objects/index_management_page';
import { IndexManagement } from './page_objects/index_management_page';

// import type { IndexManagementPageObjects } from './page_objects';
// import { extendPageObjects } from './page_objects';

/*
interface IndexManagementPO {
  indexManagement: IndexManagement;
}

export type IndexManagementPageObjects = IndexManagementPO & PageObjects;

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage
): IndexManagementPageObjects {
  return {
    ...pageObjects,
    indexManagement: createLazyPageObject(IndexManagement, page),
  };
}
export interface ConsoleTestFixtures extends ScoutTestFixtures {
  pageObjects: IndexManagementPageObjects;
}

export const test = base.extend<ConsoleTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: IndexManagementPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: IndexManagementPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
*/

type PageObjectClass = new (page: ScoutPage) => AbstractPageObject;

export const createTest = function <PageObjectsExtensions = Record<string, AbstractPageObject>>(
  pageObjectClassMap: Record<string, PageObjectClass>
) {
  type PageObjectsExtended = PageObjectsExtensions & PageObjects;
  interface TestFixtures extends ScoutTestFixtures {
    pageObjects: PageObjectsExtended;
  }

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

  return base.extend<TestFixtures, ScoutWorkerFixtures>({
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
  });
};

export const test = createTest<{ indexManagement: IndexManagement }>({
  indexManagement: IndexManagement,
});
