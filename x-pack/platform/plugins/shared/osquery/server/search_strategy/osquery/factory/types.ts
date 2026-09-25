/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse, ISearchRequestParams } from '@kbn/search-types';
import type {
  FactoryQueryTypes,
  StrategyRequestType,
  StrategyResponseType,
} from '../../../../common/search_strategy/osquery';

/**
 * Server-internal request passed to factory `buildDsl` / `parse`.
 * `matchActionDataSpaceId` is set by the search strategy from
 * `ID_BOUND_FACTORY_QUERY_TYPES`; it is not a public request field.
 */
export type OsqueryFactoryRequest<T extends FactoryQueryTypes> = StrategyRequestType<T> & {
  matchActionDataSpaceId?: boolean;
};

export interface OsqueryFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: OsqueryFactoryRequest<T>) => ISearchRequestParams;
  parse: (
    options: OsqueryFactoryRequest<T>,
    response: IEsSearchResponse
  ) => Promise<StrategyResponseType<T>>;
}
