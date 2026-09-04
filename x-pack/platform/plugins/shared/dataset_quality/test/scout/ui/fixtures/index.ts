/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, mergeTests } from '@kbn/scout';
import { synthtraceFixture, type SynthtraceFixture } from '@kbn/scout-synthtrace';

import { extendPageObjects, type DatasetQualityPageObjects } from './page_objects';

export interface DatasetQualityTestFixtures extends ScoutTestFixtures {
  pageObjects: DatasetQualityPageObjects;
}

export type DatasetQualityWorkerFixtures = ScoutWorkerFixtures & SynthtraceFixture;

/**
 * Adds the Data Set Quality page objects and the worker-scoped synthtrace clients
 * used to seed log documents.
 */
export const test = mergeTests(baseTest, synthtraceFixture).extend<
  DatasetQualityTestFixtures,
  DatasetQualityWorkerFixtures
>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendPageObjects(pageObjects, page));
  },
});

export * as testData from './constants';
