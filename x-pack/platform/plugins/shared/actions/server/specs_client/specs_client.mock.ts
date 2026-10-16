/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISpecsClient } from './types';

export type SpecsClientMock = jest.Mocked<ISpecsClient>;

const createSpecsClientMock = () => {
  const mocked: SpecsClientMock = {
    get: jest.fn(),
    getAll: jest.fn(),
  };
  return mocked;
};

export const specsClientMock = {
  create: createSpecsClientMock,
};
