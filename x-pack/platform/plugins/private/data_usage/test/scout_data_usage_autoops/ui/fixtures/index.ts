/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { PageObjects, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import type { DataUsagePageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface DataUsageTestFixtures extends ScoutTestFixtures {
  pageObjects: DataUsagePageObjects;
}

export const test = base.extend<DataUsageTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: PageObjects; page: ScoutPage },
    use: (pageObjects: DataUsagePageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
});

export * from '../../common/constants';
export { startAutoOpsMock, stopAutoOpsMock } from '../../common/autoops_mock';
export { createDataStream, deleteDataStream } from '../../common/data_streams';
