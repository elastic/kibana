/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createQueryService } from '../services/query_service/query_service.mock';
import { createTransitionStrategyFactory } from './strategies/strategy_resolver.mock';
import { DirectorService, type DirectorServiceContract } from './director';

export function createDirectorService(): {
  directorService: DirectorService;
  mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
} {
  const { queryService, mockEsClient } = createQueryService();
  const { loggerService } = createLoggerService();

  const strategyFactory = createTransitionStrategyFactory();
  const directorService = new DirectorService(strategyFactory, queryService, loggerService);

  return {
    directorService,
    mockEsClient,
  };
}

/**
 * Fully-stubbed {@link DirectorServiceContract} for tests that only care about
 * what a consumer does with the director's result (e.g. `DirectorStep`). For
 * tests that need the real transition computation, use
 * {@link createDirectorService} instead.
 */
export function createMockDirectorService(): jest.Mocked<DirectorServiceContract> {
  return {
    run: jest.fn(),
  };
}
