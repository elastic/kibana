/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import { IndexPattern } from 'ui/index_patterns';
import { IndexPatternTitle } from '../../../../../../common/types/kibana';
import { Field, SplitField, AggFieldPair } from '../../../../../../common/types/fields';
import { ml } from '../../../../services/ml_api_service';
import { mlResultsService } from '../../../../services/results_service';
import { getCategoryFields as getCategoryFieldsOrig } from './searches';
import { aggFieldPairsCanBeCharted } from '../job_creator/util/general';

type DetectorIndex = number;
export interface LineChartPoint {
  time: number | string;
  value: number;
}
type SplitFieldValue = string | null;
export type LineChartData = Record<DetectorIndex, LineChartPoint[]>;

const eq = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);

const newJobLineChart = memoizeOne(ml.jobs.newJobLineChart, eq);
const newJobPopulationsChart = memoizeOne(ml.jobs.newJobPopulationsChart, eq);
const getEventRateData = memoizeOne(mlResultsService.getEventRateData, eq);
const getCategoryFields = memoizeOne(getCategoryFieldsOrig, eq);

export class ChartLoader {
  private _indexPatternTitle: IndexPatternTitle = '';
  private _timeFieldName: string = '';
  private _query: object = {};

  constructor(indexPattern: IndexPattern, query: object) {
    this._indexPatternTitle = indexPattern.title;
    this._query = query;

    if (typeof indexPattern.timeFieldName === 'string') {
      this._timeFieldName = indexPattern.timeFieldName;
    }
  }

  async loadLineCharts(
    start: number,
    end: number,
    aggFieldPairs: AggFieldPair[],
    splitField: SplitField,
    splitFieldValue: SplitFieldValue,
    intervalMs: number
  ): Promise<LineChartData> {
    if (this._timeFieldName !== '') {
      if (aggFieldPairsCanBeCharted(aggFieldPairs) === false) {
        // no elasticsearch aggregation, this must contain ML only functions
        return {};
      }

      const splitFieldName = splitField !== null ? splitField.name : null;
      const aggFieldPairNames = aggFieldPairs.map(getAggFieldPairNames);

      const resp = await newJobLineChart(
        this._indexPatternTitle,
        this._timeFieldName,
        start,
        end,
        intervalMs,
        this._query,
        aggFieldPairNames,
        splitFieldName,
        splitFieldValue
      );
      if (resp.error !== undefined) {
        throw resp.error;
      }
      return resp.results;
    }
    return {};
  }

  async loadPopulationCharts(
    start: number,
    end: number,
    aggFieldPairs: AggFieldPair[],
    splitField: SplitField,
    intervalMs: number
  ): Promise<LineChartData> {
    if (this._timeFieldName !== '') {
      if (aggFieldPairsCanBeCharted(aggFieldPairs) === false) {
        // no elasticsearch aggregation, this must contain ML only functions
        return {};
      }

      const splitFieldName = splitField !== null ? splitField.name : '';
      const aggFieldPairNames = aggFieldPairs.map(getAggFieldPairNames);

      const resp = await newJobPopulationsChart(
        this._indexPatternTitle,
        this._timeFieldName,
        start,
        end,
        intervalMs,
        this._query,
        aggFieldPairNames,
        splitFieldName
      );
      if (resp.error !== undefined) {
        throw resp.error;
      }
      return resp.results;
    }
    return {};
  }

  async loadEventRateChart(
    start: number,
    end: number,
    intervalMs: number
  ): Promise<LineChartPoint[]> {
    if (this._timeFieldName !== '') {
      const resp = await getEventRateData(
        this._indexPatternTitle,
        this._query,
        this._timeFieldName,
        start,
        end,
        intervalMs * 3
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

  async loadFieldExampleValues(field: Field): Promise<string[]> {
    const { results } = await getCategoryFields(
      this._indexPatternTitle,
      field.name,
      10,
      this._query
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
