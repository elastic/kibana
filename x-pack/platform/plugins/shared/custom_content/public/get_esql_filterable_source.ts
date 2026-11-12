/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { EsqlSource } from '@kbn/data-source';
import type { FilterableSource } from '@kbn/data-source';
import {
  getProjectRoutingFromEsqlQuery,
  getSourceCommandQueryFromESQLQuery,
} from '@kbn/esql-utils';

/**
 * The source of the dataset a query reads, which is what the dashboard needs for the filter bar: the
 * fields of the FROM target and whether it has a time field. The time field is read from the whole
 * query, since `?_tstart` and `TBUCKET` can name it, and the fields from the source command alone,
 * so the query itself is never run.
 */
export const getEsqlFilterableSource = async ({
  query,
  http,
  projectRouting,
}: {
  query: string;
  http: HttpStart;
  projectRouting: string | undefined;
}): Promise<FilterableSource> => {
  const { timeFieldName } = await EsqlSource.resolveDataset({ query, http, projectRouting });
  const source = await EsqlSource.create({
    query: getSourceCommandQueryFromESQLQuery(query) || query,
    http,
    projectRouting: getProjectRoutingFromEsqlQuery(query) ?? projectRouting,
    timeFieldName,
    resolveTimeField: false,
  });
  return source.toFilterableSource(http);
};
