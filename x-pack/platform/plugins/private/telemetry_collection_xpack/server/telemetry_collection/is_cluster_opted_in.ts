/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryAggregatedStats } from './get_stats_with_xpack';

export const isClusterOptedIn = (clusterUsage?: TelemetryAggregatedStats): boolean => {
  return (
    clusterUsage?.stack_stats?.kibana?.plugins?.telemetry?.opt_in_status === true ||
    // If stack_stats.kibana.plugins.telemetry does not exist, assume opted-in for BWC
    !clusterUsage?.stack_stats?.kibana?.plugins?.telemetry
  );
};
