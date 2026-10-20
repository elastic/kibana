/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  DIRECTION_FIELD,
  STEP_DURATION_FIELD,
  STEP_ID_FIELD,
  STEP_ITEMS_FIELD,
} from '../constants';
import { baseSearchParams, buildUnitFilter, type StatsWindow } from './unit_filter';

/**
 * One search for all processor ids (the telemetry calls them steps). It sums over every
 * placement, with no pipeline id filter. Items count the `in` direction and every outcome.
 *
 * Failures would be items `in` with outcome `failure`. `refused` means a component downstream
 * failed, so it belongs to that component and is not counted here. They are not queried yet,
 * see the note on `failures` below.
 *
 * The duration is a `sum`, divided by the items sum in the mapper, so the average is per
 * event. An `avg` would divide by the number of collector calls and give a per batch number.
 */
export const buildProcessorStatsRequest = ({
  unitId,
  window,
  ids,
  configHash,
}: {
  unitId: string;
  window: StatsWindow;
  ids: string[];
  configHash?: string;
}): estypes.SearchRequest => ({
  ...baseSearchParams,
  size: 0,
  query: {
    bool: {
      filter: [
        ...buildUnitFilter({ unitId, window, configHash }),
        { terms: { [STEP_ID_FIELD]: ids } },
      ],
    },
  },
  aggs: {
    by_id: {
      terms: { field: STEP_ID_FIELD, size: ids.length },
      aggs: {
        items_in: {
          filter: {
            bool: {
              filter: [
                { exists: { field: STEP_ITEMS_FIELD } },
                { term: { [DIRECTION_FIELD]: 'in' } },
              ],
            },
          },
          aggs: {
            sum: { sum: { field: STEP_ITEMS_FIELD } },
            // Processor failures cannot be observed yet: the collector ignores OTTL statement
            // errors (`error_mode: ignore`), so a record that fails a statement still leaves the
            // processor as a success. Without this aggregation the mapper leaves the failures
            // rate null (no data). Once
            // https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/52158
            // is fixed, restore this and import OUTCOME_FAILURE and OUTCOME_FIELD from
            // '../constants'.
            // failures: {
            //   filter: { term: { [OUTCOME_FIELD]: OUTCOME_FAILURE } },
            //   aggs: { sum: { sum: { field: STEP_ITEMS_FIELD } } },
            // },
          },
        },
        duration: {
          filter: { exists: { field: STEP_DURATION_FIELD } },
          aggs: { sum: { sum: { field: STEP_DURATION_FIELD } } },
        },
      },
    },
  },
});
