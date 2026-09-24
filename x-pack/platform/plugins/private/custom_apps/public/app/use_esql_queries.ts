/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dateMath from '@kbn/datemath';
import type { HttpStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { getESQLResults, getESQLTimeField } from '@kbn/esql-utils';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DataModel, JsonValue } from '@kbn/a2ui-renderer';
import type { EsqlQuery } from '../../common/app_definition';

/** How long to wait after a control changes before re-running its queries. */
const PARAM_DEBOUNCE_MS = 250;

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

export function shapeResult(
  response: ESQLSearchResponse,
  shape: EsqlQuery['shape'],
  groupBy?: string
): JsonValue {
  const rows = rowsToObjects(response);
  if (shape === 'rows') return rows;
  if (shape === 'groups') {
    // Nests rows so a ChildList template can render one card per group — ES|QL
    // returns flat rows, and grouping is a data concern rather than something a
    // component should own.
    if (!groupBy) return [];
    const byKey = new Map<string, Array<Record<string, JsonValue>>>();
    for (const row of rows) {
      const key = String(row[groupBy] ?? '');
      const bucket = byKey.get(key);
      if (bucket) bucket.push(row);
      else byKey.set(key, [row]);
    }
    return [...byKey.entries()]
      .map(([key, items]) => ({ key, count: items.length, items }))
      .sort((a, b) => b.count - a.count);
  }
  if (shape === 'first') return rows[0] ?? null;
  // 'value' — the first cell of the first row, for single-number panels.
  const first = rows[0];
  if (!first) return null;
  const firstKey = Object.keys(first)[0];
  return firstKey === undefined ? null : first[firstKey];
}

/**
 * ES|QL named parameters are scalars. An array is joined to CSV rather than
 * passed through, because the *empty* selection — the resting state of every
 * filter control — has no defined substitution as a multi-value parameter. A
 * query pairs this with `?p == "" OR MV_CONTAINS(SPLIT(?p, ","), field)`, where
 * the empty string means "no filter".
 */
export function toParamValue(value: JsonValue | undefined): string | number {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined && item !== '')
      .map((item) => String(item))
      .join(',');
  }
  if (typeof value === 'object') return '';
  return value;
}

const variablesFor = (
  query: EsqlQuery,
  values: Record<string, JsonValue | undefined>
): ESQLControlVariable[] =>
  Object.entries(query.params ?? {}).map(([name, pointer]) => ({
    key: name,
    value: toParamValue(values[pointer]),
    type: ESQLVariableType.VALUES,
  }));

/**
 * `getESQLTimeField` costs a `field_caps` request per query per run. Once a
 * control can re-run queries, every debounced keystroke would repeat them for no
 * new information — the time field of a given query never changes.
 */
const timeFieldCache = new Map<string, Promise<string | undefined>>();

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
 * Watches only the data model pointers this panel's queries actually reference,
 * and reports them as a string signature. Subscribing imperatively rather than
 * through `useSyncExternalStore` is deliberate: that hook needs a referentially
 * stable snapshot, and a freshly built params object would loop forever.
 */
function useQueryParamValues(
  queries: EsqlQuery[] | undefined,
  dataModel: DataModel | undefined
): { values: Record<string, JsonValue | undefined>; signature: string } {
  const pointers = useMemo(
    () =>
      [...new Set((queries ?? []).flatMap((query) => Object.values(query.params ?? {})))].sort(),
    [queries]
  );

  const read = useCallback(() => {
    const out: Record<string, JsonValue | undefined> = {};
    for (const pointer of pointers) out[pointer] = dataModel?.get(pointer);
    return out;
  }, [pointers, dataModel]);

  const [values, setValues] = useState(read);
  const signature = JSON.stringify(values);
  const signatureRef = useRef(signature);
  signatureRef.current = signature;

  useEffect(() => {
    if (!dataModel || pointers.length === 0) return;
    // The model is shared app-wide, so most writes are irrelevant here; compare
    // before scheduling anything.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = dataModel.subscribe(() => {
      const next = read();
      if (JSON.stringify(next) === signatureRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setValues(next), PARAM_DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [dataModel, pointers, read]);

  return { values, signature };
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
  const { values, signature } = useQueryParamValues(queries, dataModel);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    if (!queries?.length || !dataModel) {
      setState({ isLoading: false, errors: [] });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setState((current) => ({ isLoading: true, errors: current.errors }));

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
              variables: variablesFor(entry, valuesRef.current),
            });
            if (cancelled) return;
            dataModel.set(entry.path, shapeResult(response, entry.shape, entry.groupBy));
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
    // `signature` rather than `values`: a string changes only when a watched
    // pointer really changed, where a new object would fire on every write.
  }, [queries, dataModel, timeRange, search, http, signature]);

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
    let lookup = timeFieldCache.get(esqlQuery);
    if (!lookup) {
      lookup = getESQLTimeField({ query: esqlQuery, http }).then((field) => field ?? undefined);
      timeFieldCache.set(esqlQuery, lookup);
    }
    timeField = await lookup;
  } catch {
    // Field caps unavailable, or the query has no index to resolve — run
    // unfiltered. Drop the rejected promise so a transient failure is retried.
    timeFieldCache.delete(esqlQuery);
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
