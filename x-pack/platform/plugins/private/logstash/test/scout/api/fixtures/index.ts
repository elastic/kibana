/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as base } from '@kbn/scout';
import { getLogstashApiService, type LogstashApiService } from '../services/logstash_api_service';

// Augment the shared ApiServicesFixture interface so that apiServices.logstash is typed
// everywhere inside this plugin's Scout tests.
declare module '@kbn/scout' {
  interface ApiServicesFixture {
    logstash: LogstashApiService;
  }
}

export const apiTest = base.extend<{}, { apiServices: import('@kbn/scout').ApiServicesFixture }>({
  apiServices: [
    async ({ apiServices, esClient, log }, use) => {
      await use(Object.assign(apiServices, { logstash: getLogstashApiService({ esClient, log }) }));
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
