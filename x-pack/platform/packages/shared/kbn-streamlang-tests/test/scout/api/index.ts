/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Condition, StreamlangDSL } from '@kbn/streamlang';
import type { RoutingStatus } from '@kbn/streams-schema';
import type { IngestStream, IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import type { ApiServicesFixture, ApiServicesTypes } from '@kbn/scout';
import { mergeTests, apiTest } from '@kbn/scout';

import { esqlFixture } from './fixtures/esql_fixture';
import { testBedFixture } from './fixtures/test_bed_fixture';

interface CustomApiServicesTypes extends ApiServicesTypes {
  streams: {
    condition: Condition;
    streamlangDSL: StreamlangDSL;
    routingStatus: RoutingStatus;
    streamDefinition: IngestStream.all.GetResponse;
    ingestUpsertRequest: IngestUpsertRequest;
  };
}

// Extend apiTest to provide typed apiServices.streams
const typedApiTest = apiTest.extend({
  // Extend apiServices to provide typed StreamsApiService
  apiServices: async ({ apiServices }, use) => {
    // The runtime object is the same, we just provide explicit types
    const typedApiServices = apiServices as unknown as ApiServicesFixture<CustomApiServicesTypes>;
    await (use as any)(typedApiServices);
  },
});

export const streamlangApiTest = mergeTests(typedApiTest, esqlFixture, testBedFixture);
