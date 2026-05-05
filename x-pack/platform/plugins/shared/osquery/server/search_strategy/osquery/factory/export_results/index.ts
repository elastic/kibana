/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type {
  ExportResultsRequestOptions,
  ExportResultsStrategyResponse,
  OsqueryQueries,
} from '../../../../../common/search_strategy/osquery';
import type { OsqueryFactory } from '../types';
import { buildExportResultsQuery } from './query.export_results.dsl';

export const exportResults: OsqueryFactory<OsqueryQueries.exportResults> = {
  buildDsl: (options: ExportResultsRequestOptions) => buildExportResultsQuery(options),
  parse: async (
    _options: ExportResultsRequestOptions,
    response: IEsSearchResponse
  ): Promise<ExportResultsStrategyResponse> => ({
    ...response,
    hits: response.rawResponse.hits,
  }),
};
