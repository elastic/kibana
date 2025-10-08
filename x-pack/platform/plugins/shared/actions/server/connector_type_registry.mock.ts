/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorTypeRegistryContract } from './types';

const createConnectorTypeRegistryMock = () => {
  const mocked: jest.Mocked<ConnectorTypeRegistryContract> = {
    has: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    getAllTypes: jest.fn(),
    ensureActionTypeEnabled: jest.fn(),
    isActionTypeEnabled: jest.fn(),
    isActionExecutable: jest.fn(),
    isSystemActionType: jest.fn(),
    getUtils: jest.fn(),
    getActionKibanaPrivileges: jest.fn(),
    hasSubFeature: jest.fn(),
  };
  return mocked;
};

export const connectorTypeRegistryMock = {
  create: createConnectorTypeRegistryMock,
};
