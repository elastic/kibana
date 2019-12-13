/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getMetricData,
  getModelPlotOutput,
  getRecordsForCriteria,
  getScheduledEventsByBucket,
} from './result_service_rx';
import {
  getEventDistributionData,
  getEventRateData,
  getInfluencerValueMaxScoreByTime,
  getOverallBucketScores,
  getRecordInfluencers,
  getRecordMaxScoreByTime,
  getRecords,
  getRecordsForDetector,
  getRecordsForInfluencer,
  getScoresByBucket,
  getTopInfluencers,
  getTopInfluencerValues,
} from './results_service';

export const mlResultsService = {
  getScoresByBucket,
  getScheduledEventsByBucket,
  getTopInfluencers,
  getTopInfluencerValues,
  getOverallBucketScores,
  getInfluencerValueMaxScoreByTime,
  getRecordInfluencers,
  getRecordsForInfluencer,
  getRecordsForDetector,
  getRecords,
  getRecordsForCriteria,
  getMetricData,
  getEventRateData,
  getEventDistributionData,
  getModelPlotOutput,
  getRecordMaxScoreByTime,
};

type time = string;
export interface ModelPlotOutputResults {
  results: Record<time, { actual: number; modelUpper: number | null; modelLower: number | null }>;
}

export interface CriteriaField {
  fieldName: string;
  fieldValue: any;
}
