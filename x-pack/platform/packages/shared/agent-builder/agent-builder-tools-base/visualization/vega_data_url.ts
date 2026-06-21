/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';

/**
 * Kibana's Vega ES|QL `data.url` object. Kibana intercepts a `data.url` with
 * `"%type%": "esql"` and resolves it against Elasticsearch, replacing the URL
 * with the query results. See the Vega `EsqlQueryParser`.
 */
export interface KibanaEsqlDataUrl {
  '%type%': 'esql';
  /** Apply the dashboard's filters/query to the ES|QL request. */
  '%context%': true;
  /** Enables `?_tstart` / `?_tend` time-param injection from the time picker. */
  '%timefield%'?: string;
  query: string;
}

/** Query references the dashboard time picker via ES|QL named params. */
const usesTimeParams = (query: string): boolean =>
  query.includes('?_tstart') || query.includes('?_tend');

const findDateColumn = (columns: EsqlEsqlColumnInfo[] | undefined): string | undefined =>
  columns?.find((column) => column.type === 'date' || column.type === 'date_nanos')?.name;

/**
 * Build the canonical Kibana ES|QL `data.url` object for a Vega spec. When the
 * query is time-picker aware, `%timefield%` is set (to a date result column when
 * one exists, otherwise a sensible default) so Kibana injects the time params.
 */
export const buildEsqlDataUrl = ({
  query,
  columns,
}: {
  query: string;
  columns?: EsqlEsqlColumnInfo[];
}): KibanaEsqlDataUrl => {
  const dataUrl: KibanaEsqlDataUrl = {
    '%type%': 'esql',
    '%context%': true,
    query,
  };

  if (usesTimeParams(query)) {
    dataUrl['%timefield%'] = findDateColumn(columns) ?? '@timestamp';
  }

  return dataUrl;
};

/**
 * Recover the ES|QL query embedded in a Vega spec's `data[].url` (the inverse of
 * {@link buildEsqlDataUrl}). Used when editing an existing Vega panel so the
 * established query/data binding is reused instead of regenerating ES|QL (which
 * would require re-discovering an index). Returns `undefined` when the spec has
 * no Kibana ES|QL data url.
 */
export const extractEsqlQueryFromSpec = (spec: string): string | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(spec);
  } catch {
    return undefined;
  }

  const dataSets = (parsed as { data?: unknown })?.data;
  if (!Array.isArray(dataSets)) {
    return undefined;
  }

  for (const dataSet of dataSets) {
    const url = (dataSet as { url?: unknown })?.url;
    if (
      url &&
      typeof url === 'object' &&
      (url as KibanaEsqlDataUrl)['%type%'] === 'esql' &&
      typeof (url as KibanaEsqlDataUrl).query === 'string'
    ) {
      return (url as KibanaEsqlDataUrl).query;
    }
  }

  return undefined;
};
