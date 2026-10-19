/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  DESTINATION_DURATION_FIELD,
  DESTINATION_ID_FIELD,
  DESTINATION_ITEMS_FIELD,
  OUTCOME_FIELD,
  OUTCOME_SUCCESS,
  TIMESTAMP_FIELD,
} from '../constants';
import { baseSearchParams, buildUnitFilter, type StatsWindow } from './unit_filter';

/**
 * One search for all destination ids: `size: 0` and a terms aggregation per id. Items and
 * latency sit under a `filter` on field existence, so the mapper can tell "no documents"
 * from a sum of zero.
 *
 * Incoming stats count every outcome. The exporter reports a document redirected to the
 * failure store twice, as `failure_store` and as `success`, so the incoming total counts
 * it twice, and the failures rate counts it once as a failure. Not worked around here, see
 * https://github.com/elastic/ingest-dev/issues/10013.
 *
 * Failures are every outcome except `success`. The exporter has no `failure` or `refused`
 * value, and matching by exclusion also catches `unknown` and values added later.
 */
export const buildDestinationStatsRequest = ({
  unitId,
  window,
  ids,
  configHash,
  bucketMs,
}: {
  unitId: string;
  window: StatsWindow;
  ids: string[];
  configHash?: string;
  bucketMs: number;
}): estypes.SearchRequest => ({
  ...baseSearchParams,
  size: 0,
  query: {
    bool: {
      filter: [
        ...buildUnitFilter({ unitId, window, configHash }),
        { terms: { [DESTINATION_ID_FIELD]: ids } },
      ],
    },
  },
  aggs: {
    by_id: {
      terms: { field: DESTINATION_ID_FIELD, size: ids.length },
      aggs: {
        items: {
          filter: { exists: { field: DESTINATION_ITEMS_FIELD } },
          aggs: {
            sum: { sum: { field: DESTINATION_ITEMS_FIELD } },
            series: {
              date_histogram: {
                field: TIMESTAMP_FIELD,
                fixed_interval: `${bucketMs}ms`,
                min_doc_count: 1,
              },
              aggs: { sum: { sum: { field: DESTINATION_ITEMS_FIELD } } },
            },
            failures: {
              filter: {
                bool: {
                  filter: [{ exists: { field: OUTCOME_FIELD } }],
                  must_not: [{ term: { [OUTCOME_FIELD]: OUTCOME_SUCCESS } }],
                },
              },
              aggs: { sum: { sum: { field: DESTINATION_ITEMS_FIELD } } },
            },
          },
        },
        // Time per bulk request, not per document.
        duration: {
          filter: { exists: { field: DESTINATION_DURATION_FIELD } },
          aggs: { average: { avg: { field: DESTINATION_DURATION_FIELD } } },
        },
      },
    },
  },
});
