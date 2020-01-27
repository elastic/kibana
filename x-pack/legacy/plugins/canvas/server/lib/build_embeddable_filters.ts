/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../types';
// @ts-ignore Untyped Local
import { buildBoolArray } from './build_bool_array';

// TODO: We should be importing from `data/server` below instead of `data/common`, but
// need to keep `data/common` since the contents of this file are currently imported
// by the browser. This file should probably be refactored so that the pieces required
// on the client live in a `public` directory instead. See kibana/issues/52343
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TimeRange, esFilters } from '../../../../../../src/plugins/data/common';

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

export function getQueryFilters(filters: Filter[]): esFilters.Filter[] {
  return buildBoolArray(filters).map(esFilters.buildQueryFilter);
}

export function buildEmbeddableFilters(filters: Filter[]): EmbeddableFilterInput {
  return {
    timeRange: getTimeRangeFromFilters(filters),
    filters: getQueryFilters(filters),
  };
}
