/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../types';
// @ts-ignore Untyped Local
import { buildBoolArray } from './build_bool_array';
import {
  TimeRange,
  esFilters,
  Filter as DataFilter,
} from '../../../../../../src/plugins/data/public';

export interface EmbeddableFilterInput {
  filters: DataFilter[];
  timeRange?: TimeRange;
}

const TimeFilterType = 'time';

function getTimeRangeFromFilters(filters: Filter[]): TimeRange | undefined {
  const timeFilter = filters.find(
    (filter) => filter.type !== undefined && filter.type === TimeFilterType
  );

  return timeFilter !== undefined && timeFilter.from !== undefined && timeFilter.to !== undefined
    ? {
        from: timeFilter.from,
        to: timeFilter.to,
      }
    : undefined;
}

export function getQueryFilters(filters: Filter[]): DataFilter[] {
  return buildBoolArray(filters).map(esFilters.buildQueryFilter);
}

export function buildEmbeddableFilters(filters: Filter[]): EmbeddableFilterInput {
  return {
    timeRange: getTimeRangeFromFilters(filters),
    filters: getQueryFilters(filters),
  };
}
