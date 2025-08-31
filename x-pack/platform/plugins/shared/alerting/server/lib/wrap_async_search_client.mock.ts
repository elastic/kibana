/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown as KibanaRequest;

export const wrapAsyncSearchClientMock = jest.fn().mockImplementation(() => {
  return {
    client: jest
      .fn()
      .mockReturnValue(dataPluginMock.createStartContract().search.asScoped(fakeRequest)),
    getMetrics: jest.fn(),
  };
});
