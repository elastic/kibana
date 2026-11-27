/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetExecutionsByIdsResponse,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from './types';

export const createMockGetExecutionsByIdsResponse = <TExecution>(
  documents: TExecution[],
  options: {
    index?: string;
    missing?: string[];
  } = {}
): GetExecutionsByIdsResponse<TExecution> => ({
  items: documents.map((document) => ({
    document,
    index: options.index ?? '.workflows-executions',
  })),
  missing: options.missing ?? [],
});

export const createMockWorkflowDataClient = (
  overrides: Partial<jest.Mocked<WorkflowExecutionsDataClient>> = {}
): jest.Mocked<WorkflowExecutionsDataClient> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    getByIds: jest.fn(),
    bulk: jest.fn(),
    deleteByQuery: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  }) as jest.Mocked<WorkflowExecutionsDataClient>;

export const createMockStepDataClient = (
  overrides: Partial<jest.Mocked<StepExecutionsDataClient>> = {}
): jest.Mocked<StepExecutionsDataClient> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    getByIds: jest.fn(),
    bulk: jest.fn(),
    deleteByQuery: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  }) as jest.Mocked<StepExecutionsDataClient>;
