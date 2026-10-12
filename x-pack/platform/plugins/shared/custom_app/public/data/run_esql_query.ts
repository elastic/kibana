/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { ISearchGeneric } from '@kbn/search-types';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { fetchEsqlData } from '@kbn/custom-content-renderer';
import type { RunQuery } from './data_layer';

/**
 * Runs a source's ES|QL with the panel's time range, filters and query. The query text is never
 * touched: state values travel only as named parameters, which Elasticsearch substitutes, and a
 * state key shadows a dashboard ES|QL control variable of the same name.
 */
export const createRunEsqlQuery =
  ({ search, http }: { search: ISearchGeneric; http: HttpStart }): RunQuery =>
  async (source, { context, state }, signal) => {
    const stateVariables = Object.entries(state).map(
      ([key, value]): ESQLControlVariable => ({
        key,
        type: ESQLVariableType.VALUES,
        // ES|QL accepts a JSON boolean as a parameter; the dashboard variable type only lists
        // the kinds its controls can produce.
        value: value as ESQLControlVariable['value'],
      })
    );
    const dashboardVariables = (context.esqlVariables ?? []).filter(({ key }) => !(key in state));

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
        esqlVariables: [...dashboardVariables, ...stateVariables],
      }
    );
    return { columns, rows: values };
  };
