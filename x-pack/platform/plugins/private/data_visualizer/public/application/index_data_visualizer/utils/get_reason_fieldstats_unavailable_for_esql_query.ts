/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery } from '@kbn/es-query';

import type { Query } from '@kbn/es-query';
import { queryCannotBeSampled } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';

export const getReasonIfFieldStatsUnavailableForQuery = (
  query?: AggregateQuery | Query | { [key: string]: any }
): string | undefined => {
  // Currently we can't support TS command because missing count() support
  if (query && isOfAggregateQueryType(query) && query.esql) {
    const trimmedQuery = query.esql.trim();
    if (trimmedQuery.toLowerCase().startsWith('ts')) {
      return i18n.translate('xpack.dataVisualizer.fieldStats.unavailableForTSQuery', {
        defaultMessage: `Field statistics are not available for ES|QL with the TS command.`,
      });
    }
  }

  if (queryCannotBeSampled(query)) {
    return i18n.translate('xpack.dataVisualizer.fieldStats.unavailableForESQLQueryDescription', {
      defaultMessage: `Field statistics are not available for ES|QL queries with 'MATCH' or 'QSTR' functions.`,
    });
  }
};
