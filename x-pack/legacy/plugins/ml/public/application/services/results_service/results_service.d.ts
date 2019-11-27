/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getScoresByBucket(
  jobIds: string[],
  earliestMs: number,
  latestMs: number,
  interval: string | number,
  maxResults: number
): Promise<any>;
export function getTopInfluencers(): Promise<any>;
export function getTopInfluencerValues(): Promise<any>;
export function getOverallBucketScores(
  jobIds: any,
  topN: any,
  earliestMs: any,
  latestMs: any,
  interval?: any
): Promise<any>;
export function getInfluencerValueMaxScoreByTime(): Promise<any>;
export function getRecordInfluencers(): Promise<any>;
export function getRecordsForInfluencer(): Promise<any>;
export function getRecordsForDetector(): Promise<any>;
export function getRecords(): Promise<any>;
export function getEventRateData(
  index: string,
  query: any,
  timeFieldName: string,
  earliestMs: number,
  latestMs: number,
  interval: string | number
): Promise<any>;
export function getEventDistributionData(): Promise<any>;
export function getRecordMaxScoreByTime(): Promise<any>;
