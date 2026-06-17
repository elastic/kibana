/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServiceMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/server/mocks';

export function getMockedRouterDeps() {
  const httpService = httpServiceMock.createSetupContract();
  const elasticsearch = elasticsearchServiceMock.createSetup();
  const expressions = expressionsPluginMock.createSetupContract();
  const router = httpService.createRouter();

  return {
    router,
    expressions,
    elasticsearch,
    logger: loggingSystemMock.create().get(),
  };
}
