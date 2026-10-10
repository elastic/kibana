/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getIndexPatternFromESQLQuery, parseTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import { DEFAULT_TIME_FIELD, getDateFieldNames } from './date_fields';

/**
 * Reject a query that ignores the time picker on a source without `@timestamp`.
 *
 * Kibana applies the time range on its own only to `@timestamp`, or to the field it parses
 * from the function that takes `?_tstart`/`?_tend`. On a source whose event time lives in
 * another date field (e.g. `order_date`), the query must filter or bucket that field with
 * those params; params in a comment, wrapped in `TO_DATETIME`, or on an alias are not enough.
 *
 * Returns a message to feed back to the model, or undefined when the query is fine or the
 * source cannot be checked.
 */
export const findMissingTimeFilterError = async (
  esClient: ElasticsearchClient,
  query: string | undefined
): Promise<string | undefined> => {
  if (!query) {
    return undefined;
  }
  const index = getIndexPatternFromESQLQuery(query);
  if (!index) {
    return undefined;
  }
  const timeField = parseTimeFieldFromESQLQuery(query);
  if (timeField === DEFAULT_TIME_FIELD) {
    return undefined;
  }

  try {
    const dateFields = await getDateFieldNames(esClient, index);
    if (
      dateFields.length === 0 ||
      dateFields.includes(DEFAULT_TIME_FIELD) ||
      (timeField && dateFields.includes(timeField))
    ) {
      return undefined;
    }

    const problem = timeField
      ? `The query applies the time picker to "${timeField}", which is not a date field of "${index}", so the chart would ignore the time picker.`
      : `The query does not filter a date field with ?_tstart/?_tend, so the chart would ignore the time picker: "${index}" has no ${DEFAULT_TIME_FIELD} field for Kibana to filter on its own.`;
    return `${problem} Pick its event-time field (one of: ${dateFields.join(
      ', '
    )}) and filter it before STATS with WHERE <time field> >= ?_tstart AND <time field> < ?_tend, or bucket it with BUCKET(<time field>, 100, ?_tstart, ?_tend) when the chart groups by time. Keep the query without a time filter only when the request asks for all-time data or none of these dates is an event time.`;
  } catch {
    return undefined;
  }
};
