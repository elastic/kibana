/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { STATS_COLUMN, UNIT_HEARTBEAT_DOWN_THRESHOLD_MS } from '../constants';
import { stringOrNull, type EsqlRow } from './esql_rows';

export const NO_UNIT_LIVENESS: StreamsUnit.HealthResponse['liveness'] = {
  state: 'no_heartbeat',
  last_seen: null,
};

/**
 * The liveness from the row of the heartbeat query. A row with no `last_seen` is no heartbeat.
 * Otherwise the unit is up while its newest heartbeat is no older than the down threshold.
 */
export const mapUnitLivenessRows = ({
  rows,
  now,
}: {
  rows: EsqlRow[];
  now: Date;
}): StreamsUnit.HealthResponse['liveness'] => {
  const [row] = rows;
  const lastSeen = stringOrNull(row?.[STATS_COLUMN.lastSeen]);
  if (lastSeen === null) return NO_UNIT_LIVENESS;

  const isUp = now.getTime() - Date.parse(lastSeen) <= UNIT_HEARTBEAT_DOWN_THRESHOLD_MS;

  return { state: isUp ? 'up' : 'down', last_seen: lastSeen };
};
