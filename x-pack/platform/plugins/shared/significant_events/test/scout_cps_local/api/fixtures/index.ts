/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getStreamsTestApiService,
  type StreamsTestApiService,
} from '@kbn/streams-plugin/test/scout/api/services/streams_api_service';
import { significantEventsApiTest } from '../../../scout/api/fixtures';

/**
 * CPS variant of the Significant Events API test. It inherits the Streams auth
 * roles and shared API services from the base suite and adds the Streams API
 * service needed to set up the query stream under test.
 *
 * `streamsTest` is worker scoped so that `beforeAll`/`afterAll` hooks can use it.
 */
export const significantEventsCpsApiTest = significantEventsApiTest.extend<
  {},
  { streamsTest: StreamsTestApiService }
>({
  streamsTest: [
    async ({ kbnClient, esClient, log }, use) => {
      await use(getStreamsTestApiService({ kbnClient, esClient, log }));
    },
    { scope: 'worker' },
  ],
});

export { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../../scout/api/fixtures';
