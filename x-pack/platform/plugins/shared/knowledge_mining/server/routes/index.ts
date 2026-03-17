/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { MemoryServiceImpl, SuggestionServiceImpl } from '../services';
import { registerMemoryRoutes } from './memories';
import { registerSuggestionRoutes } from './suggestions';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  getServices: () => {
    memoryService: MemoryServiceImpl;
    suggestionService: SuggestionServiceImpl;
  };
}

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerMemoryRoutes(dependencies);
  registerSuggestionRoutes(dependencies);
};
