/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryServiceContract } from './query_service';

export function createMockQueryService() {
  type QueryServiceMock = jest.Mocked<QueryServiceContract>;
  const queryService = {
    executeQuery: jest.fn() as jest.MockedFunction<QueryServiceContract['executeQuery']>,
    queryResponseToRecords: jest.fn() as jest.MockedFunction<
      QueryServiceContract['queryResponseToRecords']
    >,
  } satisfies QueryServiceMock;

  return queryService;
}
