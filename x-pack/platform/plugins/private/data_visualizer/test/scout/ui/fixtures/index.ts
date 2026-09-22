/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest, spaceTest as spaceBaseTest } from '@kbn/scout';
import { getMlTestResources, type MlTestResources } from './ml_test_resources';
import { extendPageObjects, type DataVisualizerPageObjects } from './page_objects';

export interface DataVisualizerTestFixtures extends ScoutTestFixtures {
  pageObjects: DataVisualizerPageObjects;
}

export interface DataVisualizerWorkerFixtures extends ScoutWorkerFixtures {
  mlTestResources: MlTestResources;
}

export const test = baseTest.extend<DataVisualizerTestFixtures, DataVisualizerWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendPageObjects(pageObjects, page));
  },
  mlTestResources: [
    async ({ apiServices, kbnClient, log }, use) => {
      await use(getMlTestResources({ apiServices, kbnClient, log }));
    },
    { scope: 'worker' },
  ],
});

export interface DataVisualizerParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: DataVisualizerPageObjects;
}

export interface DataVisualizerParallelWorkerFixtures extends ScoutParallelWorkerFixtures {
  mlTestResources: MlTestResources;
}

export type ExtParallelRunTestFixtures = DataVisualizerParallelTestFixtures &
  DataVisualizerParallelWorkerFixtures;

export const spaceTest = spaceBaseTest.extend<
  DataVisualizerParallelTestFixtures,
  DataVisualizerParallelWorkerFixtures
>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendPageObjects(pageObjects, page));
  },
  mlTestResources: [
    async ({ apiServices, kbnClient, log }, use) => {
      await use(getMlTestResources({ apiServices, kbnClient, log }));
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
