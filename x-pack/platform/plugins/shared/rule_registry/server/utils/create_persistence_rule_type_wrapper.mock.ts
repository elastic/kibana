/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import type { PersistenceServices } from './persistence_types';

export const createPersistenceServicesMock = (): jest.Mocked<PersistenceServices> => {
  return {
    alertWithPersistence: jest.fn(),
    alertWithSuppression: jest.fn(),
  };
};

export type PersistenceExecutorOptionsMock = ReturnType<
  typeof createPersistenceExecutorOptionsMock
>;
export const createPersistenceExecutorOptionsMock = () => {
  return {
    ...alertsMock.createRuleExecutorServices(),
    ...createPersistenceServicesMock(),
  };
};
