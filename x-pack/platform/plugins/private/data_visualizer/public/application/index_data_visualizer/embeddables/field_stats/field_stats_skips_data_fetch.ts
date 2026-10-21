/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import {
  FieldStatsInitializerViewType,
  type FieldStatsInitialState,
} from '../../../../../common/embeddables/types';

/**
 * Field statistics are not supported for ES|QL queries. The panel shows an empty
 * message instead of the stats table, so no stats request should run.
 */
export function isUnsupportedFieldStatsEsqlQuery(
  query?: { esql: string } | AggregateQuery | Query
): boolean {
  return Boolean(query && isOfAggregateQueryType(query));
}

/**
 * True when the panel will not fetch field statistics. Callers must clear the
 * loading flag in this case, or the dashboard Refresh button stays on Cancel.
 */
export function fieldStatsSkipsDataFetch({
  viewType,
  isEsqlEnabled,
  query,
  hasDataView,
}: {
  viewType?: FieldStatsInitializerViewType | NonNullable<FieldStatsInitialState['view_type']>;
  isEsqlEnabled: boolean;
  query?: { esql: string } | AggregateQuery | Query;
  hasDataView: boolean;
}): boolean {
  if (viewType === FieldStatsInitializerViewType.ESQL) {
    if (!isEsqlEnabled) {
      return true;
    }
    return isUnsupportedFieldStatsEsqlQuery(query);
  }

  if (viewType === FieldStatsInitializerViewType.DATA_VIEW) {
    return !hasDataView;
  }

  return false;
}
