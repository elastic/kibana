/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorTokenClientContract } from '../types';
import type { SharedConnectorTokenClient } from './shared_connector_token_client';
import type { UserConnectorTokenClient } from './user_connector_token_client';

const sharedCredentialsClientMock = {
  create: jest.fn() as jest.MockedFunction<SharedConnectorTokenClient['create']>,
  get: jest.fn() as jest.MockedFunction<SharedConnectorTokenClient['get']>,
  update: jest.fn(),
  deleteConnectorTokens: jest.fn(),
  updateOrReplace: jest.fn(),
  createWithRefreshToken: jest.fn(),
  updateWithRefreshToken: jest.fn(),
} as unknown as jest.Mocked<SharedConnectorTokenClient>;

const userCredentialsClientMock = {
  create: jest.fn() as jest.MockedFunction<UserConnectorTokenClient['create']>,
  get: jest.fn() as jest.MockedFunction<UserConnectorTokenClient['get']>,
  getOAuthPersonalToken: jest.fn() as jest.MockedFunction<
    UserConnectorTokenClient['getOAuthPersonalToken']
  >,
  update: jest.fn(),
  deleteConnectorTokens: jest.fn(),
  updateOrReplace: jest.fn(),
  createWithRefreshToken: jest.fn(),
  updateWithRefreshToken: jest.fn(),
} as unknown as jest.Mocked<UserConnectorTokenClient>;

const createConnectorTokenClientMock = (): jest.Mocked<ConnectorTokenClientContract> => {
  const mocked = {
    create: jest.fn() as jest.MockedFunction<ConnectorTokenClientContract['create']>,
    get: jest.fn() as jest.MockedFunction<ConnectorTokenClientContract['get']>,
    getOAuthPersonalToken: jest.fn(),
    update: jest.fn(),
    deleteConnectorTokens: jest.fn(),
    updateOrReplace: jest.fn(),
    createWithRefreshToken: jest.fn(),
    updateWithRefreshToken: jest.fn(),
    getSharedCredentialsClient: jest.fn(() => sharedCredentialsClientMock),
    getUserCredentialsClient: jest.fn(() => userCredentialsClientMock),
  } satisfies jest.Mocked<ConnectorTokenClientContract>;

  return mocked;
};

export const connectorTokenClientMock = {
  create: createConnectorTokenClientMock,
};
