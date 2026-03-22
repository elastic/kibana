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
  PageObjects,
} from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import type { AbstractPageObject } from './page_objects/compliance_page';
import { CompliancePage } from './page_objects/compliance_page';
import { CUSTOM_ROLES } from './custom_roles';

type PageObjectClass = new (page: ScoutPage) => AbstractPageObject;

export interface ComplianceBrowserAuthFixture extends BrowserAuthFixture {
  loginAsComplianceViewer: () => Promise<void>;
  loginAsComplianceEditor: () => Promise<void>;
  loginAsComplianceAdmin: () => Promise<void>;
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
      browserAuth: ComplianceBrowserAuthFixture;
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
      use: (browserAuth: ComplianceBrowserAuthFixture) => Promise<void>
    ) => {
      const loginAsComplianceViewer = async () =>
        browserAuth.loginWithCustomRole(CUSTOM_ROLES.complianceViewer);

      const loginAsComplianceEditor = async () =>
        browserAuth.loginWithCustomRole(CUSTOM_ROLES.complianceEditor);

      const loginAsComplianceAdmin = async () =>
        browserAuth.loginWithCustomRole(CUSTOM_ROLES.complianceAdmin);

      await use({
        ...browserAuth,
        loginAsComplianceViewer,
        loginAsComplianceEditor,
        loginAsComplianceAdmin,
      });
    },
  });
};

export const test = createTest<{ compliance: CompliancePage }>({
  compliance: CompliancePage,
});
