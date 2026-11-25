/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * - `up`: the newest heartbeat is recent.
 * - `down`: a heartbeat exists in the lookback, but it is too old.
 * - `no_heartbeat`: no heartbeat in the lookback. The unit may not have started yet, may have been
 *   down longer than the lookback, or may not report metrics at all, so this is not `down`.
 */
export type UnitLivenessState = 'up' | 'down' | 'no_heartbeat';

/** Read relative to now: it does not depend on a time range or a config hash. */
export interface UnitHealthResponse {
  liveness: {
    state: UnitLivenessState;
    /** `@timestamp` of the newest heartbeat within the lookback. Null when there is none. */
    last_seen: string | null;
  };
}
