/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutPage, PageObjects } from '@kbn/scout';
import { createLazyPageObject, spaceTest as baseSpaceTest } from '@kbn/scout';
import { ChangePointChartPage } from './page_objects/change_point_chart';

interface AiopsUiFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & {
    changePointChart: ChangePointChartPage;
  };
}

export const spaceTest = baseSpaceTest.extend<AiopsUiFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: PageObjects; page: ScoutPage },
    use: (pageObjects: AiopsUiFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      changePointChart: createLazyPageObject(ChangePointChartPage, page),
    });
  },
});

export * as testData from './constants';
