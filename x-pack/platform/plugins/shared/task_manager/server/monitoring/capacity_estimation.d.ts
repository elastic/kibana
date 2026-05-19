/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { Logger } from '@kbn/core/server';
import type { RawMonitoringStats, RawMonitoredStat } from './monitoring_stats_stream';
export interface CapacityEstimationStat extends JsonObject {
  observed: {
    observed_kibana_instances: number;
    max_throughput_per_minute: number;
    max_throughput_per_minute_per_kibana: number;
    minutes_to_drain_overdue: number;
    avg_required_throughput_per_minute: number;
    avg_required_throughput_per_minute_per_kibana: number;
    avg_recurring_required_throughput_per_minute: number;
    avg_recurring_required_throughput_per_minute_per_kibana: number;
  };
  proposed: {
    provisioned_kibana: number;
    min_required_kibana: number;
    avg_recurring_required_throughput_per_minute_per_kibana: number;
    avg_required_throughput_per_minute_per_kibana: number;
  };
}
export type CapacityEstimationParams = Omit<
  Required<RawMonitoringStats['stats']>,
  'capacity_estimation'
>;
export declare function estimateCapacity(
  logger: Logger,
  capacityStats: CapacityEstimationParams,
  assumedKibanaInstances: number
): RawMonitoredStat<CapacityEstimationStat>;
export declare function withCapacityEstimate(
  logger: Logger,
  monitoredStats: RawMonitoringStats['stats'],
  assumedKibanaInstances: number
): RawMonitoringStats['stats'];
