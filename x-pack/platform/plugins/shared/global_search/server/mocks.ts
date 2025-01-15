/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  RouteHandlerGlobalSearchContext,
  GlobalSearchRequestHandlerContext,
} from './types';
import { searchServiceMock } from './services/search_service.mock';
import { contextMock } from './services/context.mock';

const createSetupMock = (): jest.Mocked<GlobalSearchPluginSetup> => {
  const searchMock = searchServiceMock.createSetupContract();

  return {
    registerResultProvider: searchMock.registerResultProvider,
  };
};

const createStartMock = (): jest.Mocked<GlobalSearchPluginStart> => {
  const searchMock = searchServiceMock.createStartContract();

  return {
    find: searchMock.find,
    getSearchableTypes: searchMock.getSearchableTypes,
  };
};

const createRouteHandlerContextMock = (): jest.Mocked<RouteHandlerGlobalSearchContext> => {
  const handlerContextMock = {
    find: jest.fn(),
    getSearchableTypes: jest.fn(),
  };

  handlerContextMock.find.mockReturnValue(of([]));

  return handlerContextMock;
};

const createRequestHandlerContextMock = (): jest.Mocked<GlobalSearchRequestHandlerContext> => {
  const handlerContextMock = {
    find: jest.fn(),
    getSearchableTypes: jest.fn(),
  };

  handlerContextMock.find.mockReturnValue(of([]));

  return coreMock.createCustomRequestHandlerContext({
    core: coreMock.createRequestHandlerContext(),
    globalSearch: handlerContextMock,
  });
};

export const globalSearchPluginMock = {
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
  createRouteHandlerContext: createRouteHandlerContextMock,
  createProviderContext: contextMock.create,
  createRequestHandlerContext: createRequestHandlerContextMock,
};
