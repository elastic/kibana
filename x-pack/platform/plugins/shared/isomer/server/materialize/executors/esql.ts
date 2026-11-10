/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { appendLimitToQuery } from '@kbn/esql-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { MaterializeContext } from '../../../common';
import type { MaterializeLoss } from '../nodes';
import type { EsqlDataRequest } from '../types';

export interface EsqlExecutorDeps {
  search: Pick<IScopedSearchClient, 'esql'>;
  abortSignal: AbortSignal;
  maxRows: number;
  timeoutMs: number;
}

/** A request's table, and what the pipeline dropped from it. */
export interface ExecutedTable {
  table: Datatable;
  losses: MaterializeLoss[];
}

/** Raised when a data request runs past its timeout. */
export class DataRequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      i18n.translate('xpack.isomer.materialize.timeout', {
        defaultMessage: 'The query did not finish within {seconds} seconds.',
        values: { seconds: timeoutMs / 1000 },
      })
    );
    this.name = 'DataRequestTimeoutError';
  }
}

const toNamedParams = (params: EsqlDataRequest['params']) =>
  params ? Object.entries(params).map(([name, value]) => ({ [name]: value })) : undefined;

/** Caps `table` at `maxRows`, recording the rows it drops. */
export const capRows = (table: Datatable, maxRows: number, index: number): ExecutedTable => {
  if (table.rows.length <= maxRows) {
    return { table, losses: [] };
  }
  return {
    table: { ...table, rows: table.rows.slice(0, maxRows) },
    losses: [
      {
        path: 'data.rows',
        kind: 'dropped',
        note: i18n.translate('xpack.isomer.materialize.rowCap', {
          defaultMessage:
            'Kept the first {maxRows} rows of data request {index}; its query returned more.',
          values: { maxRows, index },
        }),
      },
    ],
  };
};

/**
 * Runs an ES|QL request as the user, the way Lens's `esql` expression does: the context's time
 * range, filters, query and control values go through the search service's Kibana query context.
 * One row past the cap is requested, so a capped result is known to be capped.
 */
export const executeEsql = async (
  request: EsqlDataRequest,
  context: MaterializeContext,
  index: number,
  { search, abortSignal, maxRows: pipelineMaxRows, timeoutMs }: EsqlExecutorDeps
): Promise<ExecutedTable> => {
  const maxRows = Math.min(request.maxRows ?? pipelineMaxRows, pipelineMaxRows);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abort = () => controller.abort();
  abortSignal.addEventListener('abort', abort, { once: true });
  if (abortSignal.aborted) {
    controller.abort();
  }
  try {
    const { datatable } = await search.esql(
      {
        query: appendLimitToQuery(request.query, maxRows + 1),
        params: toNamedParams(request.params),
        timeZone: context.timeZone,
        locale: context.locale,
        kibanaQueryContext: {
          timeRange: context.timeRange,
          timeField: request.timeField,
          kibanaFilters: context.filters ?? [],
          kqlQuery: context.query,
          esqlVariables: context.esqlVariables,
        },
        dropNullColumns: true,
      },
      { abortSignal: controller.signal, includeDataTable: true }
    );
    if (!datatable) {
      throw new Error('The ES|QL search returned no table.');
    }
    return capRows(datatable, maxRows, index);
  } catch (error) {
    if (timedOut) {
      throw new DataRequestTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    abortSignal.removeEventListener('abort', abort);
  }
};
