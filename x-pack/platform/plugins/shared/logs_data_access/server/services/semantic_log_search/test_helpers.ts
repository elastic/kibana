/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import { RERANK_ENDPOINT } from './constants';
import type { SemanticLogSearchDeps } from './types';

/** Server-side deps for a search call, defaulted to the rerank endpoint that `config.ts` ships. */
export const searchDeps = (logger: Logger = loggerMock.create()): SemanticLogSearchDeps => ({
  logger,
  rerankInferenceId: RERANK_ENDPOINT,
});
