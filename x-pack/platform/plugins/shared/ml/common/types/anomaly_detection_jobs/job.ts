/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export type JobId = string;
export type BucketSpan = estypes.Duration;

// temporary Job override, waiting for es client to have correct types
export type Job = estypes.MlJob;

export type MlJobBlocked = estypes.MlJobBlocked;

export type AnalysisConfig = estypes.MlAnalysisConfig;

export type Detector = estypes.MlDetector;

export type AnalysisLimits = estypes.MlAnalysisLimits;

export type DataDescription = estypes.MlDataDescription;

export type ModelPlotConfig = estypes.MlModelPlotConfig;

export type CustomRule = estypes.MlDetectionRule;

export interface PerPartitionCategorization {
  enabled?: boolean;
  stop_on_warn?: boolean;
}

export type CustomSettings = estypes.MlCustomSettings;

export function isAnomalyDetectionJob(arg: unknown): arg is Job {
  return (
    isPopulatedObject(arg) && typeof arg.job_id === 'string' && arg.analysis_config !== undefined
  );
}
