/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { ISearchGeneric } from '@kbn/search-types';
import { fetchEsqlData } from '@kbn/custom-content-renderer';
import type { RunQuery } from './data_layer';

/** Runs a source's ES|QL with the panel's time range, filters, query and variables. */
export const createRunEsqlQuery =
  ({ search, http }: { search: ISearchGeneric; http: HttpStart }): RunQuery =>
  async (source, context, signal) => {
    const { columns, values } = await fetchEsqlData(
      search,
      http,
      source.query,
      context.timeRange,
      signal,
      {
        isApproximate: context.isApproximate,
        projectRouting: context.projectRouting,
        query: context.query,
        filters: context.filters,
        esqlVariables: context.esqlVariables,
      }
    );
    return { columns, rows: values };
  };
