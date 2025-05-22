/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProvider } from '@kbn/onechat-server';
import type {
  ToolsServiceStart,
  ScopedPublicToolRegistry,
  ScopedPublicToolRegistryFactoryFn,
} from '../services/tools/types';
import { ChangeReturnType } from './common';

export type ToolProviderMock = jest.Mocked<ToolProvider>;
export type ScopedPublicToolRegistryMock = jest.Mocked<ScopedPublicToolRegistry>;
export type ScopedPublicToolRegistryFactoryFnMock = jest.MockedFn<
  ChangeReturnType<ScopedPublicToolRegistryFactoryFn, ScopedPublicToolRegistryMock>
>;

export type ToolsServiceStartMock = ToolsServiceStart & {
  registry: ToolProviderMock;
  getScopedRegistry: ScopedPublicToolRegistryFactoryFnMock;
};

export const createToolProviderMock = (): ToolProviderMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
};

export const createScopedPublicToolRegistryMock = (): ScopedPublicToolRegistryMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
};

export const createToolsServiceStartMock = (): ToolsServiceStartMock => {
  return {
    registry: createToolProviderMock(),
    getScopedRegistry: jest.fn().mockImplementation(() => createScopedPublicToolRegistryMock),
  };
};
