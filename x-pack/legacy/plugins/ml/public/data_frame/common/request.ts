/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultOperator } from 'elasticsearch';

import { IndexPattern } from 'ui/index_patterns';

import { dictionaryToArray } from '../../../common/types/common';

import { DefinePivotExposedState } from '../components/define_pivot/define_pivot_form';
import { JobDetailsExposedState } from '../components/job_details/job_details_form';

import {
  getEsAggFromAggConfig,
  getEsAggFromGroupByConfig,
  isGroupByDateHistogram,
  isGroupByHistogram,
  isGroupByTerms,
  PivotGroupByConfig,
} from '../common';

import { PivotAggDict, PivotAggsConfig } from './pivot_aggs';
import { DateHistogramAgg, HistogramAgg, PivotGroupByDict, TermsAgg } from './pivot_group_by';
import { SavedSearchQuery } from './kibana_context';

export interface DataFramePreviewRequest {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
  source: {
    index: string;
    query?: any;
  };
}

export interface DataFrameRequest extends DataFramePreviewRequest {
  dest: {
    index: string;
  };
}

export interface DataFrameJobConfig extends DataFrameRequest {
  id: string;
}

export interface SimpleQuery {
  query_string: {
    query: string;
    default_operator: DefaultOperator;
  };
}

export type PivotQuery = SimpleQuery | SavedSearchQuery;

export function getPivotQuery(search: string | SavedSearchQuery): PivotQuery {
  if (typeof search === 'string') {
    return {
      query_string: {
        query: search,
        default_operator: 'AND',
      },
    };
  }

  return search;
}

export function isSimpleQuery(arg: any): arg is SimpleQuery {
  return arg.query_string !== undefined;
}

export function isDefaultQuery(query: PivotQuery): boolean {
  return isSimpleQuery(query) && query.query_string.query === '*';
}

export function getDataFramePreviewRequest(
  indexPatternTitle: IndexPattern['title'],
  query: PivotQuery,
  groupBy: PivotGroupByConfig[],
  aggs: PivotAggsConfig[]
): DataFramePreviewRequest {
  const request: DataFramePreviewRequest = {
    source: {
      index: indexPatternTitle,
    },
    pivot: {
      group_by: {},
      aggregations: {},
    },
  };

  if (!isDefaultQuery(query)) {
    request.source.query = query;
  }

  groupBy.forEach(g => {
    if (isGroupByTerms(g)) {
      const termsAgg: TermsAgg = {
        terms: {
          field: g.field,
        },
      };
      request.pivot.group_by[g.aggName] = termsAgg;
    } else if (isGroupByHistogram(g)) {
      const histogramAgg: HistogramAgg = {
        histogram: {
          field: g.field,
          interval: g.interval,
        },
      };
      request.pivot.group_by[g.aggName] = histogramAgg;
    } else if (isGroupByDateHistogram(g)) {
      const dateHistogramAgg: DateHistogramAgg = {
        date_histogram: {
          field: g.field,
          calendar_interval: g.calendar_interval,
        },
      };
      request.pivot.group_by[g.aggName] = dateHistogramAgg;
    } else {
      request.pivot.group_by[g.aggName] = getEsAggFromGroupByConfig(g);
    }
  });

  aggs.forEach(agg => {
    request.pivot.aggregations[agg.aggName] = getEsAggFromAggConfig(agg);
  });

  return request;
}

export function getDataFrameRequest(
  indexPatternTitle: IndexPattern['title'],
  pivotState: DefinePivotExposedState,
  jobDetailsState: JobDetailsExposedState
): DataFrameRequest {
  const request: DataFrameRequest = {
    ...getDataFramePreviewRequest(
      indexPatternTitle,
      getPivotQuery(pivotState.search),
      dictionaryToArray(pivotState.groupByList),
      dictionaryToArray(pivotState.aggList)
    ),
    // conditionally add optional description
    ...(jobDetailsState.jobDescription !== ''
      ? { description: jobDetailsState.jobDescription }
      : {}),
    dest: {
      index: jobDetailsState.destinationIndex,
    },
    // conditionally add continuous mode config
    ...(jobDetailsState.isContinuousModeEnabled
      ? {
          sync: {
            time: {
              field: jobDetailsState.continuousModeDateField,
              delay: jobDetailsState.continuousModeDelay,
            },
          },
        }
      : {}),
  };

  return request;
}
