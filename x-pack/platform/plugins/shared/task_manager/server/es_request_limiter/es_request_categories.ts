/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The categories of Elasticsearch requests that Task Manager can budget
 * independently. The string values double as the config keys under
 * `xpack.task_manager.es_request_limits`.
 */
export enum EsRequestCategory {
  Search = 'search',
  Write = 'write',
}

/**
 * Maps Elasticsearch client method names to the request category used for
 * limiting. Only methods listed here are metered; every other property on the
 * client passes through unlimited. Cleanup-style calls (e.g. `closePointInTime`)
 * are intentionally excluded so tasks can always release resources.
 */
const ES_METHOD_CATEGORY: Readonly<Record<string, EsRequestCategory>> = {
  // Reads / searches
  search: EsRequestCategory.Search,
  msearch: EsRequestCategory.Search,
  mget: EsRequestCategory.Search,
  get: EsRequestCategory.Search,
  count: EsRequestCategory.Search,
  scroll: EsRequestCategory.Search,
  openPointInTime: EsRequestCategory.Search,
  fieldCaps: EsRequestCategory.Search,
  termsEnum: EsRequestCategory.Search,
  explain: EsRequestCategory.Search,
  searchShards: EsRequestCategory.Search,
  // Writes
  bulk: EsRequestCategory.Write,
  index: EsRequestCategory.Write,
  create: EsRequestCategory.Write,
  update: EsRequestCategory.Write,
  delete: EsRequestCategory.Write,
  deleteByQuery: EsRequestCategory.Write,
  updateByQuery: EsRequestCategory.Write,
};

/**
 * Returns the request category for an Elasticsearch client method, or
 * `undefined` if the method is not metered.
 */
export const getCategoryForMethod = (method: string): EsRequestCategory | undefined =>
  ES_METHOD_CATEGORY[method];
