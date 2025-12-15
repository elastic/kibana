/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
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

// Define the base type locally since ApiServicesTypes export may not be available
// This matches the structure in @kbn/scout
interface BaseApiServicesTypes {
  streams?: {
    condition?: unknown;
    streamlangDSL?: unknown;
    routingStatus?: string;
    streamDefinition?: unknown;
    ingestUpsertRequest?: unknown;
  };
}

interface CustomApiServicesTypes extends BaseApiServicesTypes {
  streams: {
    condition: Condition;
    streamlangDSL: StreamlangDSL;
    routingStatus: RoutingStatus;
    streamDefinition: IngestStream.all.GetResponse;
    ingestUpsertRequest: IngestUpsertRequest;
  };
}

// Export the typed fixture type for use in tests
export type TypedApiServicesFixture = ApiServicesFixture<CustomApiServicesTypes>;

export interface StreamsTestFixtures extends ScoutTestFixtures {
  pageObjects: StreamsPageObjects;
}

export const test = baseTest
  .extend({
    // Extend apiServices to provide typed StreamsApiService
    apiServices: async ({ apiServices }, use) => {
      // Create a typed wrapper that provides properly typed methods
      const typedApiServices: ApiServicesFixture<CustomApiServicesTypes> = {
        ...apiServices,
        streams: {
          ...apiServices.streams,
          // Override getStreamDefinition to return the correct type
          getStreamDefinition: async (streamName: string) => {
            const result = await apiServices.streams.getStreamDefinition(streamName);
            return result as IngestStream.all.GetResponse;
          },
        },
      } as ApiServicesFixture<CustomApiServicesTypes>;

      // Use 'as any' to bypass Playwright's strict type checking for generic fixture types
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
