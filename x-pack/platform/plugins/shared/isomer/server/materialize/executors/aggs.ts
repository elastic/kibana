/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type {
  AggConfigSerialized,
  AggsCommonStart,
  ISearchStartSearchSource,
} from '@kbn/data-plugin/common';
import { handleEsaggsRequest } from '@kbn/data-plugin/common';
import type { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import type { MaterializeContext } from '../../../common';
import type { AggsDataRequest } from '../types';
import type { ExecutedTable } from './esql';
import { DataRequestTimeoutError, capRows } from './esql';

/** The user-scoped services an `aggs` request runs with, as the server `esaggs` function uses them. */
export interface AggsServices {
  dataViews: Pick<DataViewsService, 'get' | 'create'>;
  aggs: Pick<AggsCommonStart, 'createAggConfigs'>;
  searchSource: ISearchStartSearchSource;
}

export interface AggsExecutorDeps {
  getServices: () => Promise<AggsServices>;
  abortSignal: AbortSignal;
  maxRows: number;
  timeoutMs: number;
}

const TIME_ZONE_AGGS = new Set(['date_histogram', 'date_range']);

/** The context's time zone on the date aggs that don't set their own; without one, `dateFormat:tz` applies. */
const withTimeZone = (aggs: AggConfigSerialized[], timeZone?: string): AggConfigSerialized[] =>
  timeZone
    ? aggs.map((agg) =>
        TIME_ZONE_AGGS.has(agg.type) && !(agg.params && 'time_zone' in agg.params)
          ? { ...agg, params: { ...agg.params, time_zone: timeZone } }
          : agg
      )
    : aggs;

const loadDataView = (
  dataViews: AggsServices['dataViews'],
  dataView: AggsDataRequest['dataView']
): Promise<DataView> =>
  typeof dataView === 'string'
    ? dataViews.get(dataView, false)
    : dataViews.create(dataView, false, false);

/**
 * Runs an `aggs` request as the user, the way Kibana's server `esaggs` function does: agg configs
 * from the server aggs service, the request and its time filter from `handleEsaggsRequest`, and the
 * response through `tabify`. The context's time range, filters and query apply to it.
 */
export const executeAggs = async (
  request: AggsDataRequest,
  context: MaterializeContext,
  index: number,
  { getServices, abortSignal, maxRows: pipelineMaxRows, timeoutMs }: AggsExecutorDeps
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
    const { dataViews, aggs, searchSource } = await getServices();
    const dataView = await loadDataView(dataViews, request.dataView);
    const aggConfigs = aggs.createAggConfigs(
      dataView,
      withTimeZone(request.aggs, context.timeZone),
      {
        hierarchical: request.metricsAtAllLevels ?? false,
        partialRows: request.partialRows ?? false,
        probability: request.probability,
        samplerSeed: request.samplerSeed,
      }
    );
    const table = await lastValueFrom(
      handleEsaggsRequest({
        abortSignal: controller.signal,
        aggs: aggConfigs,
        filters: context.filters,
        indexPattern: dataView,
        inspectorAdapters: {},
        query: context.query,
        searchSourceService: searchSource,
        timeFields: request.timeFields,
        timeRange: context.timeRange,
        disableWarningToasts: true,
      })
    );
    return capRows(table, maxRows, index);
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
