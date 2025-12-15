/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  ApiServicesTypes,
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';
import type { Condition, StreamlangDSL } from '@kbn/streamlang';
import type { RoutingStatus } from '@kbn/streams-schema';
import type { IngestStream, IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import type { StreamsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

interface CustomApiServicesTypes extends ApiServicesTypes {
  streams: {
    condition: Condition;
    streamlangDSL: StreamlangDSL;
    routingStatus: RoutingStatus;
    streamDefinition: IngestStream.all.GetResponse;
    ingestUpsertRequest: IngestUpsertRequest;
  };
}

export interface StreamsTestFixtures extends ScoutTestFixtures {
  pageObjects: StreamsPageObjects;
}

export const test = baseTest
  .extend({
    // Extend apiServices to provide typed StreamsApiService
    apiServices: async ({ apiServices }, use) => {
      // The runtime object is the same, we just provide explicit types
      const typedApiServices = apiServices as unknown as ApiServicesFixture<CustomApiServicesTypes>;
      await (use as any)(typedApiServices);
    },
  })
  .extend<StreamsTestFixtures, ScoutWorkerFixtures>({
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
  });
