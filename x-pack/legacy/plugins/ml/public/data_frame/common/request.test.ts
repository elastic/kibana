/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PivotGroupByConfig } from '../common';

import { JobDetailsExposedState } from '../components/job_details/job_details_form';
import { DefinePivotExposedState } from '../components/define_pivot/define_pivot_form';

import { PIVOT_SUPPORTED_GROUP_BY_AGGS } from './pivot_group_by';
import { PivotAggsConfig, PIVOT_SUPPORTED_AGGS } from './pivot_aggs';
import {
  getDataFramePreviewRequest,
  getDataFrameRequest,
  getPivotQuery,
  isDefaultQuery,
  isSimpleQuery,
  PivotQuery,
} from './request';

const defaultQuery: PivotQuery = { query_string: { query: '*' } };
const matchAllQuery: PivotQuery = { match_all: {} };
const simpleQuery: PivotQuery = { query_string: { query: 'airline:AAL' } };

describe('Data Frame: Common', () => {
  test('isSimpleQuery()', () => {
    expect(isSimpleQuery(defaultQuery)).toBe(true);
    expect(isSimpleQuery(matchAllQuery)).toBe(false);
    expect(isSimpleQuery(simpleQuery)).toBe(true);
  });

  test('isDefaultQuery()', () => {
    expect(isDefaultQuery(defaultQuery)).toBe(true);
    expect(isDefaultQuery(matchAllQuery)).toBe(false);
    expect(isDefaultQuery(simpleQuery)).toBe(false);
  });

  test('getPivotQuery()', () => {
    const query = getPivotQuery('the-query');

    expect(query).toEqual({
      query_string: {
        query: 'the-query',
        default_operator: 'AND',
      },
    });
  });

  test('getDataFramePreviewRequest()', () => {
    const query = getPivotQuery('the-query');
    const groupBy: PivotGroupByConfig[] = [
      {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: 'the-group-by-field',
        aggName: 'the-group-by-agg-name',
        dropDownName: 'the-group-by-drop-down-name',
      },
    ];
    const aggs: PivotAggsConfig[] = [
      {
        agg: PIVOT_SUPPORTED_AGGS.AVG,
        field: 'the-agg-field',
        aggName: 'the-agg-agg-name',
        dropDownName: 'the-agg-drop-down-name',
      },
    ];
    const request = getDataFramePreviewRequest('the-index-pattern-title', query, groupBy, aggs);

    expect(request).toEqual({
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: 'the-index-pattern-title',
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });

  test('getDataFrameRequest()', () => {
    const groupBy: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const agg: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-agg-field',
      aggName: 'the-agg-agg-name',
      dropDownName: 'the-agg-drop-down-name',
    };
    const pivotState: DefinePivotExposedState = {
      aggList: { 'the-agg-name': agg },
      groupByList: { 'the-group-by-name': groupBy },
      search: 'the-query',
      valid: true,
    };
    const jobDetailsState: JobDetailsExposedState = {
      createIndexPattern: false,
      jobId: 'the-job-id',
      targetIndex: 'the-target-index',
      touched: true,
      valid: true,
    };

    const request = getDataFrameRequest('the-index-pattern-title', pivotState, jobDetailsState);

    expect(request).toEqual({
      dest: { index: 'the-target-index' },
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: 'the-index-pattern-title',
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });
});
