/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../types';
// @ts-ignore Untyped Local
import { buildBoolArray } from './build_bool_array';
import { TimeRange, esFilters } from '../../../../../../src/plugins/data/server';

export interface EmbeddableFilterInput {
  filters: esFilters.Filter[];
  timeRange?: TimeRange;
}

const TimeFilterType = 'time';

function getTimeRangeFromFilters(filters: Filter[]): TimeRange | undefined {
  const timeFilter = filters.find(
    filter => filter.type !== undefined && filter.type === TimeFilterType
  );

  return timeFilter !== undefined && timeFilter.from !== undefined && timeFilter.to !== undefined
    ? {
        from: timeFilter.from,
        to: timeFilter.to,
      }
    : undefined;
}

function getQueryFilters(filters: Filter[]): esFilters.Filter[] {
  return buildBoolArray(filters.filter(filter => filter.type !== 'time')).map(
    esFilters.buildQueryFilter
  );
}

export function buildEmbeddableFilters(filters: Filter[]): EmbeddableFilterInput {
  return {
    timeRange: getTimeRangeFromFilters(filters),
    filters: getQueryFilters(filters),
  };
}
