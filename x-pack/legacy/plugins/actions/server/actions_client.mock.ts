/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsClient } from './actions_client';

type ActionsClientContract = PublicMethodsOf<ActionsClient>;

const createActionsClientMock = () => {
  const mocked: jest.Mocked<ActionsClientContract> = {
    create: jest.fn(),
    get: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  return mocked;
};

export const actionsClientMock = {
  create: createActionsClientMock,
};
