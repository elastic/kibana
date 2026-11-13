/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  OUTCOME_FIELD,
  SOURCE_ID_FIELD,
  SOURCE_ITEMS_FIELD,
  STATS_COLUMN,
  UNIT_METRICS_STREAM,
} from '../constants';
import {
  filterByIds,
  filterByUnitAndWindow,
  nullifyUnmappedColumns,
  type StatsQueryBaseParams,
} from './filters';

/** Sources have no config hash, so a pinned one does not apply to them. */
interface SourceStatsQueryParams extends Omit<StatsQueryBaseParams, 'configHash'> {
  /** A non-empty list of source ids. */
  ids: string[];
}

/**
 * Accepted rate per source, from a plain `FROM`. It is computed as the destination rate is: the
 * exact sum of items over the time from where the first delta in the window starts to the end of
 * the window. Only documents of the items metric count, because the request, duration and bytes
 * documents carry the source id too. A source whose items were all refused or failed has rows but
 * no `success` sum, so its rate is 0, and a source with no items in the window has no row.
 */
export const buildSourceRateQuery = ({
  ids,
  unitId,
  window,
}: SourceStatsQueryParams): ComposerQuery => {
  const items = normalizeColumn(SOURCE_ITEMS_FIELD);
  const outcome = normalizeColumn(OUTCOME_FIELD);
  const sourceId = normalizeColumn(SOURCE_ID_FIELD);
  const acceptedRate = esql.col(STATS_COLUMN.acceptedRate);
  const id = esql.col(STATS_COLUMN.id);

  return nullifyUnmappedColumns(
    filterByIds(
      filterByUnitAndWindow(esql.from(UNIT_METRICS_STREAM), { unitId, window }),
      SOURCE_ID_FIELD,
      ids
    )
  ).pipe`WHERE ${items} IS NOT NULL`.pipe`EVAL delta = TO_DOUBLE(${items})`
    .pipe`STATS accepted_items = SUM(delta) WHERE ${outcome} == "success",
        covered_from = MIN(start_timestamp)
      BY ${id} = ${sourceId}`
    .pipe`EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, ${window.end}) / 1000.0`
    .pipe`EVAL ${acceptedRate} = COALESCE(accepted_items, 0.0) / window_seconds`
    .pipe`KEEP ${id}, ${acceptedRate}`;
};
