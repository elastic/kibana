/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PivotGroupByConfig } from '../common';

import { StepDefineExposedState } from '../sections/create_transform/components/step_define/step_define_form';
import { StepDetailsExposedState } from '../sections/create_transform/components/step_details/step_details_form';

import { PIVOT_SUPPORTED_GROUP_BY_AGGS } from './pivot_group_by';
import { PivotAggsConfig, PIVOT_SUPPORTED_AGGS } from './pivot_aggs';
import {
  getPreviewRequestBody,
  getCreateRequestBody,
  getPivotQuery,
  isDefaultQuery,
  isSimpleQuery,
  PivotQuery,
} from './request';

const defaultQuery: PivotQuery = { query_string: { query: '*' } };
const matchAllQuery: PivotQuery = { match_all: {} };
const simpleQuery: PivotQuery = { query_string: { query: 'airline:AAL' } };

describe('Transform: Common', () => {
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

  test('getPreviewRequestBody()', () => {
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
    const request = getPreviewRequestBody('the-index-pattern-title', query, groupBy, aggs);

    expect(request).toEqual({
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: ['the-index-pattern-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });

  test('getPreviewRequestBody() with comma-separated index pattern', () => {
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
    const request = getPreviewRequestBody(
      'the-index-pattern-title,the-other-title',
      query,
      groupBy,
      aggs
    );

    expect(request).toEqual({
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: ['the-index-pattern-title', 'the-other-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-query' } },
      },
    });
  });

  test('getCreateRequestBody()', () => {
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
    const pivotState: StepDefineExposedState = {
      aggList: { 'the-agg-name': agg },
      groupByList: { 'the-group-by-name': groupBy },
      isAdvancedPivotEditorEnabled: false,
      isAdvancedSourceEditorEnabled: false,
      sourceConfigUpdated: false,
      searchString: 'the-query',
      searchQuery: 'the-search-query',
      valid: true,
    };
    const transformDetailsState: StepDetailsExposedState = {
      continuousModeDateField: 'the-continuous-mode-date-field',
      continuousModeDelay: 'the-continuous-mode-delay',
      createIndexPattern: false,
      isContinuousModeEnabled: false,
      transformId: 'the-transform-id',
      transformDescription: 'the-transform-description',
      destinationIndex: 'the-destination-index',
      touched: true,
      valid: true,
    };

    const request = getCreateRequestBody(
      'the-index-pattern-title',
      pivotState,
      transformDetailsState
    );

    expect(request).toEqual({
      description: 'the-transform-description',
      dest: { index: 'the-destination-index' },
      pivot: {
        aggregations: { 'the-agg-agg-name': { avg: { field: 'the-agg-field' } } },
        group_by: { 'the-group-by-agg-name': { terms: { field: 'the-group-by-field' } } },
      },
      source: {
        index: ['the-index-pattern-title'],
        query: { query_string: { default_operator: 'AND', query: 'the-search-query' } },
      },
    });
  });
});
