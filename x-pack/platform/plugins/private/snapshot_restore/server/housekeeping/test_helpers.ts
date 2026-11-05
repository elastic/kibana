/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { HousekeepingContext } from '@kbn/housekeeping-plugin/server';

export const createContext = (isServerless = false) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const context: HousekeepingContext = {
    esClient,
    savedObjectsClient: savedObjectsClientMock.create(),
    isServerless,
    abortSignal: new AbortController().signal,
    logger: loggingSystemMock.createLogger(),
    fetchOnce: (_key, fetch) => fetch(new AbortController().signal),
  };
  return { esClient, context };
};
