/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Field, SplitField, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { IndicesOptions } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import { mlResultsServiceProvider } from '../../../../services/results_service';
import { getCategoryFields as getCategoryFieldsOrig } from './searches';
import {
  loadEsqlEventRate,
  loadEsqlFieldValues,
  loadEsqlLineCharts,
  type EsqlSearch,
} from './esql_searches';
import { aggFieldPairsCanBeCharted } from '../job_creator/util/general';
import type { MlApi } from '../../../../services/ml_api_service';

type DetectorIndex = number;
export interface LineChartPoint {
  time: number | string;
  value: number;
}
type SplitFieldValue = string | null;
export type LineChartData = Record<DetectorIndex, LineChartPoint[]>;

const eq = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);

export class ChartLoader {
  protected _dataView: DataView | null;
  protected _mlApi: MlApi;

  private _timeFieldName: string = '';
  private _query: object = {};

  private _newJobLineChart;
  private _newJobPopulationsChart;
  private _getEventRateData;
  private _getCategoryFields;
  private _esql: { query: string; search: EsqlSearch; summaryCountField: string | null } | null =
    null;
  private _loadEsqlLineCharts = memoizeOne(loadEsqlLineCharts, eq);
  private _loadEsqlEventRate = memoizeOne(loadEsqlEventRate, eq);
  private _loadEsqlFieldValues = memoizeOne(loadEsqlFieldValues, eq);

  constructor(mlApi: MlApi, indexPattern: DataView | null, query: object) {
    this._mlApi = mlApi;
    this._dataView = indexPattern;
    this._query = query;

    this._newJobLineChart = memoizeOne(mlApi.jobs.newJobLineChart, eq);
    this._newJobPopulationsChart = memoizeOne(mlApi.jobs.newJobPopulationsChart, eq);
    this._getEventRateData = memoizeOne(mlResultsServiceProvider(mlApi).getEventRateData, eq);
    this._getCategoryFields = memoizeOne(getCategoryFieldsOrig, eq);

    if (typeof indexPattern?.timeFieldName === 'string') {
      this._timeFieldName = indexPattern.timeFieldName;
    }
  }

  /** Sets the data view to load chart data from, for wizards that only have one after they start. */
  public setDataView(dataView: DataView) {
    this._dataView = dataView;
    this._timeFieldName = typeof dataView.timeFieldName === 'string' ? dataView.timeFieldName : '';
  }

  /**
   * Loads the line charts, event rate and field values by running this ES|QL query. Counts sum
   * summaryCountField when the query aggregates its data.
   */
  public setEsqlQuery(query: string, search: EsqlSearch, summaryCountField: string | null) {
    this._esql = { query, search, summaryCountField };
  }

  private _getEsqlSource(projectRouting?: string) {
    if (this._esql === null) {
      return null;
    }
    const { query, search, summaryCountField } = this._esql;
    return {
      search,
      esqlQuery: query,
      timeField: this._timeFieldName,
      projectRouting,
      summaryCountField,
    };
  }

  private _getIndexPattern(): string {
    if (this._dataView === null) {
      throw new Error('A data view is required to load chart data');
    }
    return this._dataView.getIndexPattern();
  }

  async loadLineCharts(
    start: number,
    end: number,
    aggFieldPairs: AggFieldPair[],
    splitField: SplitField,
    splitFieldValue: SplitFieldValue,
    intervalMs: number,
    runtimeMappings: RuntimeMappings | null,
    indicesOptions?: IndicesOptions,
    projectRouting?: string
  ): Promise<LineChartData> {
    if (this._timeFieldName !== '') {
      if (aggFieldPairsCanBeCharted(aggFieldPairs) === false) {
        // no elasticsearch aggregation, this must contain ML only functions
        return {};
      }

      const splitFieldName = splitField !== null ? splitField.name : null;
      const aggFieldPairNames = aggFieldPairs.map(getAggFieldPairNames);

      const esqlSource = this._getEsqlSource(projectRouting);
      if (esqlSource !== null) {
        return this._loadEsqlLineCharts(
          esqlSource,
          start,
          end,
          intervalMs,
          aggFieldPairNames,
          splitFieldName,
          splitFieldValue
        );
      }

      const resp = await this._newJobLineChart(
        this._getIndexPattern(),
        this._timeFieldName,
        start,
        end,
        intervalMs,
        this._query,
        aggFieldPairNames,
        splitFieldName,
        splitFieldValue,
        runtimeMappings ?? undefined,
        indicesOptions,
        projectRouting
      );

      return resp.results;
    }
    return {};
  }

  async loadPopulationCharts(
    start: number,
    end: number,
    aggFieldPairs: AggFieldPair[],
    splitField: SplitField,
    intervalMs: number,
    runtimeMappings: RuntimeMappings | null,
    indicesOptions?: IndicesOptions,
    projectRouting?: string
  ): Promise<LineChartData> {
    if (this._timeFieldName !== '') {
      if (aggFieldPairsCanBeCharted(aggFieldPairs) === false) {
        // no elasticsearch aggregation, this must contain ML only functions
        return {};
      }

      const splitFieldName = splitField !== null ? splitField.name : '';
      const aggFieldPairNames = aggFieldPairs.map(getAggFieldPairNames);

      const resp = await this._newJobPopulationsChart(
        this._getIndexPattern(),
        this._timeFieldName,
        start,
        end,
        intervalMs,
        this._query,
        aggFieldPairNames,
        splitFieldName,
        runtimeMappings ?? undefined,
        indicesOptions,
        projectRouting
      );

      return resp.results;
    }
    return {};
  }

  async loadEventRateChart(
    start: number,
    end: number,
    intervalMs: number,
    runtimeMappings?: RuntimeMappings,
    indicesOptions?: IndicesOptions,
    projectRouting?: string
  ): Promise<LineChartPoint[]> {
    if (this._timeFieldName !== '') {
      const esqlSource = this._getEsqlSource(projectRouting);
      if (esqlSource !== null) {
        return this._loadEsqlEventRate(esqlSource, start, end, intervalMs * 3);
      }

      const resp = await this._getEventRateData(
        this._getIndexPattern(),
        this._query,
        this._timeFieldName,
        start,
        end,
        intervalMs * 3,
        runtimeMappings,
        indicesOptions,
        projectRouting
      );
      if (resp.error !== undefined) {
        throw resp.error;
      }

      return Object.entries(resp.results).map(([time, value]) => ({
        time: +time,
        value: value as number,
      }));
    }
    return [];
  }

  async loadFieldExampleValues(
    field: Field,
    runtimeMappings: RuntimeMappings | null,
    indicesOptions?: IndicesOptions,
    projectRouting?: string
  ): Promise<string[]> {
    const esqlSource = this._getEsqlSource(projectRouting);
    if (esqlSource !== null) {
      return this._loadEsqlFieldValues(esqlSource, field.name, 10);
    }

    const { results } = await this._getCategoryFields(
      this._mlApi,
      this._getIndexPattern(),
      field.name,
      10,
      this._query,
      runtimeMappings ?? undefined,
      indicesOptions,
      projectRouting ?? undefined
    );
    return results;
  }
}

export function getAggFieldPairNames(af: AggFieldPair) {
  const by =
    af.by !== undefined && af.by.field !== null && af.by.value !== null
      ? { field: af.by.field.id, value: af.by.value }
      : { field: null, value: null };

  return {
    agg: af.agg.dslName || '',
    field: af.field.id,
    by,
  };
}
