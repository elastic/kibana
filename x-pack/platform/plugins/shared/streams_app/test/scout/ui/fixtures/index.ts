/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  KbnClient,
  ScoutLogger,
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';
import type { StreamsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';
import { getStreamsApiService, type StreamsApiService } from './api_service';

export interface StreamsTestFixtures extends ScoutTestFixtures {
  pageObjects: StreamsPageObjects;
}

interface StreamsApiServicesFixture extends ApiServicesFixture {
  streams: StreamsApiService;
}

export interface StreamsWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: StreamsApiServicesFixture;
}

export const test = baseTest.extend<StreamsTestFixtures, StreamsWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: StreamsPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: StreamsPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        log,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: KbnClient;
        log: ScoutLogger;
      },
      use: (extendedApiServices: StreamsApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = {
        ...apiServices,
        streams: getStreamsApiService({ kbnClient, log }),
      } as StreamsApiServicesFixture;
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});
