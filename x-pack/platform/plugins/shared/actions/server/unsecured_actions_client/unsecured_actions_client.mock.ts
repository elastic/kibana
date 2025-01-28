/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUnsecuredActionsClient } from './unsecured_actions_client';

export type UnsecuredActionsClientMock = jest.Mocked<IUnsecuredActionsClient>;

const createUnsecuredActionsClientMock = () => {
  const mocked: UnsecuredActionsClientMock = {
    getAll: jest.fn(),
    execute: jest.fn(),
    bulkEnqueueExecution: jest.fn(),
  };
  return mocked;
};

export const unsecuredActionsClientMock = {
  create: createUnsecuredActionsClientMock,
};
