/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import dateMath from '@kbn/datemath';
import type { HttpStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { getESQLResults, getESQLTimeField } from '@kbn/esql-utils';
import type { DataModel, JsonValue } from '@kbn/a2ui-renderer';
import type { EsqlQuery } from '../../common/app_definition';

/**
 * ES|QL returns columnar results; components bind to paths, so rows are turned
 * into plain objects keyed by column name.
 */
export function rowsToObjects(response: ESQLSearchResponse): Array<Record<string, JsonValue>> {
  const names = response.columns.map((column) => column.name);
  return response.values.map((row) => {
    const object: Record<string, JsonValue> = {};
    names.forEach((name, index) => {
      object[name] = (row[index] ?? null) as JsonValue;
    });
    return object;
  });
}

export function shapeResult(response: ESQLSearchResponse, shape: EsqlQuery['shape']): JsonValue {
  const rows = rowsToObjects(response);
  if (shape === 'rows') return rows;
  if (shape === 'first') return rows[0] ?? null;
  // 'value' — the first cell of the first row, for single-number panels.
  const first = rows[0];
  if (!first) return null;
  const firstKey = Object.keys(first)[0];
  return firstKey === undefined ? null : first[firstKey];
}

export interface EsqlQueriesState {
  isLoading: boolean;
  errors: string[];
}

export interface UseEsqlQueriesArgs {
  queries: EsqlQuery[] | undefined;
  dataModel: DataModel | undefined;
  timeRange: TimeRange;
  search: ISearchGeneric;
  http: HttpStart;
}

/**
 * Runs a surface's queries and writes each result into its data model. Errors
 * are returned rather than thrown: one failing query should degrade its own
 * panel, not blank the page.
 */
export function useEsqlQueries({
  queries,
  dataModel,
  timeRange,
  search,
  http,
}: UseEsqlQueriesArgs): EsqlQueriesState {
  const [state, setState] = useState<EsqlQueriesState>({ isLoading: false, errors: [] });

  useEffect(() => {
    if (!queries?.length || !dataModel) {
      setState({ isLoading: false, errors: [] });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setState({ isLoading: true, errors: [] });

    (async () => {
      const errors: string[] = [];

      await Promise.all(
        queries.map(async (entry) => {
          try {
            const filter = await buildTimeFilter(entry.query, timeRange, http);
            const { response } = await getESQLResults({
              esqlQuery: entry.query,
              search,
              signal: controller.signal,
              filter,
              timeRange,
            });
            if (cancelled) return;
            dataModel.set(entry.path, shapeResult(response, entry.shape));
          } catch (error) {
            if (cancelled || controller.signal.aborted) return;
            errors.push(`${entry.path}: ${error?.message ?? String(error)}`);
          }
        })
      );

      if (!cancelled) setState({ isLoading: false, errors });
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queries, dataModel, timeRange, search, http]);

  return state;
}

/**
 * ES|QL has no time range of its own, so the page's range is applied as a
 * filter on whatever time field the query's index reports.
 */
async function buildTimeFilter(
  esqlQuery: string,
  timeRange: TimeRange,
  http: HttpStart
): Promise<{ bool: { filter: object[] } } | undefined> {
  let timeField: string | undefined;
  try {
    timeField = (await getESQLTimeField({ query: esqlQuery, http })) ?? undefined;
  } catch {
    // Field caps unavailable, or the query has no index to resolve — run unfiltered.
    return undefined;
  }
  if (!timeField) return undefined;

  const gte = dateMath.parse(timeRange.from)?.toISOString();
  const lt = dateMath.parse(timeRange.to, { roundUp: true })?.toISOString();
  if (!gte || !lt) return undefined;

  return {
    bool: {
      filter: [{ range: { [timeField]: { gte, lt, format: 'strict_date_optional_time' } } }],
    },
  };
}
