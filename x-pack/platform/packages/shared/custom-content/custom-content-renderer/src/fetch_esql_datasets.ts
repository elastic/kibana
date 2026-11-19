/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import { fetchEsqlData, type FetchEsqlOptions } from './fetch_esql_data';
import type { TemplateDataset } from './fill_template';

export interface FetchEsqlDatasetsResult {
  /** One result set per query, in the order of the queries, ready for `fillTemplateDatasets`. */
  datasets: TemplateDataset[];
  /** Whether any query's response was approximated, or undefined when no response says. */
  approximationApplied: boolean | undefined;
}

const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { name?: unknown }).name === 'AbortError';

/**
 * Fetches every query of a panel at once. A failing query ends the others, and names itself when
 * the panel has several, while the message of a single-query panel is left as it is.
 */
export const fetchEsqlDatasets = async (
  search: ISearchGeneric,
  http: HttpStart,
  queries: readonly string[],
  timeRange: TimeRange | undefined,
  signal: AbortSignal,
  options?: FetchEsqlOptions
): Promise<FetchEsqlDatasetsResult> => {
  const batch = new AbortController();
  const abortBatch = () => batch.abort();
  if (signal.aborted) abortBatch();
  signal.addEventListener('abort', abortBatch, { once: true });

  // The adapter is cleared once, so the queries do not wipe each other's entries.
  options?.requestAdapter?.reset();

  try {
    const responses = await Promise.all(
      queries.map((query, index) =>
        fetchEsqlData(search, http, query, timeRange, batch.signal, {
          ...options,
          keepRequests: true,
          // Several requests would otherwise all be named alike in the Inspect action.
          ...(queries.length > 1 && {
            requestTitle: i18n.translate('xpack.customContent.inspector.queryRequestTitle', {
              defaultMessage: 'Data (query {position})',
              values: { position: index + 1 },
            }),
          }),
        }).catch((error: unknown) => {
          batch.abort();
          if (queries.length === 1 || isAbortError(error)) throw error;
          throw new Error(
            i18n.translate('xpack.customContent.queryFailed', {
              defaultMessage: 'Query {position} failed: {message}',
              values: {
                position: index + 1,
                message: error instanceof Error ? error.message : String(error),
              },
            })
          );
        })
      )
    );

    const flags = responses.map(({ approximation_applied: applied }) => applied);
    return {
      datasets: responses.map(({ columns, values }) => ({ columns, rows: values ?? [] })),
      approximationApplied: flags.some(Boolean) ? true : flags.includes(false) ? false : undefined,
    };
  } finally {
    signal.removeEventListener('abort', abortBatch);
  }
};
