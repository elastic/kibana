/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { DocViewer } from '@kbn/unified-doc-viewer/test/scout/ui/fixtures/page_objects';
import type { DiscoverPageObjects } from '@kbn/discover-plugin/test/scout/common/ui/fixtures';
import { DiscoverPage } from '@kbn/discover-plugin/test/scout/common/ui/fixtures';
import { DashboardLinks } from './page_objects';

export interface ReleaseTestingTestFixtures extends ScoutTestFixtures {
  pageObjects: DiscoverPageObjects & {
    dashboardLinks: DashboardLinks;
    docViewer: DocViewer;
  };
}

export const test = baseTest.extend<ReleaseTestingTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ReleaseTestingTestFixtures['pageObjects'];
      page: ReleaseTestingTestFixtures['page'];
    },
    use: (pageObjects: ReleaseTestingTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      discover: createLazyPageObject(DiscoverPage, page),
      dashboardLinks: createLazyPageObject(DashboardLinks, page),
      docViewer: createLazyPageObject(DocViewer, page),
    });
  },
});
