/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorTokenClientContract } from '../types';

const createConnectorTokenClientMock = (): jest.Mocked<ConnectorTokenClientContract> => {
  const mocked = {
    create: jest.fn() as jest.MockedFunction<ConnectorTokenClientContract['create']>,
    get: jest.fn() as jest.MockedFunction<ConnectorTokenClientContract['get']>,
    update: jest.fn(),
    deleteConnectorTokens: jest.fn(),
    updateOrReplace: jest.fn(),
    createWithRefreshToken: jest.fn(),
    updateWithRefreshToken: jest.fn(),
  } satisfies jest.Mocked<ConnectorTokenClientContract>;

  return mocked;
};

export const connectorTokenClientMock = {
  create: createConnectorTokenClientMock,
};
