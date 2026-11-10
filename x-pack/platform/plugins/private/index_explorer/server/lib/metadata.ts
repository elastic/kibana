/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findEsqlParamNames } from '../../common/esql_params';
import type { CannedQuery, CannedQueryParam, MetadataResponse } from '../../common/types';
import type { IndexExplorerConfig } from '../config';

function toCannedQuery({
  id,
  title,
  description,
  query,
  params,
}: IndexExplorerConfig['queries'][number]): CannedQuery {
  const declared: CannedQueryParam[] = params.map(({ name, type, default: defaultValue }) => ({
    name,
    type,
    defaultValue,
  }));
  const undeclared: CannedQueryParam[] = findEsqlParamNames(query)
    .filter((name) => !params.some((param) => param.name === name))
    .map((name) => ({ name, type: 'string' }));
  return { id, title, description, query, params: [...declared, ...undeclared] };
}

/** Converts plugin configuration into the metadata served to the browser. */
export function toMetadataResponse({
  title,
  description,
  queries,
  indices,
}: IndexExplorerConfig): MetadataResponse {
  return {
    title,
    description,
    queries: queries.map(toCannedQuery),
    indices,
  };
}
