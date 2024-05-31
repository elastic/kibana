/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsLogRateAnalysisSchema } from '../../api/schema';

import { paramsMock } from './params_match_all';
import { searchQueryMock } from './search_query';

export const paramsSearchQueryMock: AiopsLogRateAnalysisSchema = {
  ...paramsMock,
  searchQuery: searchQueryMock,
};
