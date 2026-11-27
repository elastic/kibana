/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  STATS_COLUMN,
  UNIT_HEARTBEAT_LOOKBACK_MS,
  UNIT_METRICS_STREAM,
  UNIT_UPTIME_FIELD,
} from '../constants';
import { filterByUnitAndWindow, nullifyUnmappedColumns } from './filters';

interface UnitHeartbeatQueryParams {
  unitId: string;
  now: Date;
}

/**
 * The time of the newest heartbeat of a unit within the lookback, as one row. `last_seen` is null
 * when there is none, because a `STATS` with no `BY` always returns a row. It is read relative to
 * now, so it has no time range and no config hash.
 */
export const buildUnitHeartbeatQuery = ({
  unitId,
  now,
}: UnitHeartbeatQueryParams): ComposerQuery => {
  const uptime = normalizeColumn(UNIT_UPTIME_FIELD);
  const lastSeen = esql.col(STATS_COLUMN.lastSeen);
  const window = {
    start: new Date(now.getTime() - UNIT_HEARTBEAT_LOOKBACK_MS).toISOString(),
    end: now.toISOString(),
  };

  return nullifyUnmappedColumns(
    filterByUnitAndWindow(esql.from(UNIT_METRICS_STREAM), { unitId, window })
  ).pipe`WHERE ${uptime} IS NOT NULL`.pipe`STATS ${lastSeen} = MAX(@timestamp)`;
};
