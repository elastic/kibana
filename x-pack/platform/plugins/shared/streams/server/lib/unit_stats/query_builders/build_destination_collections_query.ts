/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  COLLECTION_NAME_FIELD,
  DESTINATION_ID_FIELD,
  DESTINATION_ITEMS_FIELD,
  ESQL_MAX_ROWS,
  FAILURE_STORE_FIELD,
  FAILURE_STORE_OUTCOME,
  FAILURE_STORE_USED,
  OUTCOME_FIELD,
  STATS_COLUMN,
  UNIT_METRICS_STREAM,
} from '../constants';
import {
  filterDestinations,
  type DestinationStatsQueryParams,
} from './build_destination_stats_queries';

/**
 * The collections (data streams or indices) each destination wrote documents to in the window, one
 * row per destination and collection with its `documents`, from a plain `FROM`.
 *
 * `documents` are the ones that stayed in the collection: its `success` items less its
 * `failure_store: used` items, which the exporter also counted as a success. A collection is kept
 * when that is above zero, so one that rejected every document is left out. A failure of a whole
 * request names no collection, and the unit's own stats stream is left out, because no destination
 * writes it. `items` is a counter, so it is cast first. Returns at most `ESQL_MAX_ROWS` rows and
 * truncates silently.
 */
export const buildDestinationCollectionsQuery = (
  params: DestinationStatsQueryParams
): ComposerQuery => {
  const items = normalizeColumn(DESTINATION_ITEMS_FIELD);
  const outcome = normalizeColumn(OUTCOME_FIELD);
  const failureStore = normalizeColumn(FAILURE_STORE_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const collectionName = normalizeColumn(COLLECTION_NAME_FIELD);
  const id = esql.col(STATS_COLUMN.id);
  const collection = esql.col(STATS_COLUMN.collection);
  const documents = esql.col(STATS_COLUMN.documents);

  return filterDestinations(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`WHERE ${items} IS NOT NULL AND ${collectionName} IS NOT NULL AND ${collectionName} != ${UNIT_METRICS_STREAM}`
    .pipe`EVAL delta = TO_DOUBLE(${items})`
    .pipe`STATS success_items = SUM(delta) WHERE ${outcome} == "success",
        failure_store_items = SUM(delta) WHERE ${outcome} == ${FAILURE_STORE_OUTCOME} AND ${failureStore} == ${FAILURE_STORE_USED}
      BY ${id} = ${destinationId}, ${collection} = ${collectionName}`
    .pipe`EVAL ${documents} = COALESCE(success_items, 0.0) - COALESCE(failure_store_items, 0.0)`
    .pipe`WHERE ${documents} > 0`.pipe`KEEP ${id}, ${collection}, ${documents}`
    .pipe`LIMIT ${ESQL_MAX_ROWS}`;
};
