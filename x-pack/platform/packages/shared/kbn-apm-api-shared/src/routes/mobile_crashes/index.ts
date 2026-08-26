/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { crashDistributionRoute } from './crash_distribution';
import { crashMainStatisticsRoute } from './crash_main_statistics';
import { crashDetailedStatisticsRoute } from './crash_detailed_statistics';

export const mobileCrashesRouteDefinitions = {
  distribution: crashDistributionRoute,
  mainStatistics: crashMainStatisticsRoute,
  detailedStatistics: crashDetailedStatisticsRoute,
};

export type { CrashDistributionResponse } from './crash_distribution';
export type {
  MobileCrashGroupMainStatisticsResponse,
  CrashMainStatisticsRouteResponse,
} from './crash_main_statistics';
export type {
  CrashGroupDetailedStat,
  MobileCrashesGroupPeriodsResponse,
} from './crash_detailed_statistics';
