/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Globals } from '../../static_globals';

export function isKibanaStatusStale(lastSeenTimestamp: string) {
  const lastSeen = moment(lastSeenTimestamp);
  const staleThreshold = moment().subtract(
    Globals.app.config.ui.kibana.reporting.stale_status_threshold_seconds,
    'seconds'
  );
  return staleThreshold.isAfter(lastSeen);
}
