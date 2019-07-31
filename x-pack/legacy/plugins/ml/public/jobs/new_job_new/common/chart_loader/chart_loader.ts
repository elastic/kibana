/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { IndexPattern } from 'ui/index_patterns';
import { IndexPatternTitle } from '../../../../../common/types/kibana';
import { Field, SplitField, AggFieldPair } from '../../../../../common/types/fields';
import { ml } from '../../../../services/ml_api_service';
import { mlResultsService } from '../../../../services/results_service';
import { getCategoryFields } from './searches';

type DetectorIndex = number;
export interface LineChartPoint {
  time: number | string;
  value: number;
}
type SplitFieldValue = string | null;
export type LineChartData = Record<DetectorIndex, LineChartPoint[]>;

export class ChartLoader {
  protected _indexPattern: IndexPattern;
  protected _savedSearch: SavedSearch;
  protected _indexPatternTitle: IndexPatternTitle = '';
  protected _timeFieldName: string = '';
  protected _query: object = {};

  constructor(indexPattern: IndexPattern, savedSearch: SavedSearch, query: object) {
    this._indexPattern = indexPattern;
    this._savedSearch = savedSearch;
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
      const splitFieldName = splitField !== null ? splitField.name : null;

      const resp = await ml.jobs.newJobLineChart(
        this._indexPatternTitle,
        this._timeFieldName,
        start,
        end,
        intervalMs,
        this._query,
        aggFieldPairs.map(getAggFieldPairNames),
        splitFieldName,
        splitFieldValue
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
    intervalMs: number
  ): Promise<LineChartData> {
    if (this._timeFieldName !== '') {
      const splitFieldName = splitField !== null ? splitField.name : '';

      const resp = await ml.jobs.newJobPopulationsChart(
        this._indexPatternTitle,
        this._timeFieldName,
        start,
        end,
        intervalMs,
        this._query,
        aggFieldPairs.map(getAggFieldPairNames),
        splitFieldName
      );
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
      const resp = await mlResultsService.getEventRateData(
        this._indexPatternTitle,
        this._query,
        this._timeFieldName,
        start,
        end,
        intervalMs * 3
      );
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
    agg: af.agg.dslName,
    field: af.field.id,
    by,
  };
}
