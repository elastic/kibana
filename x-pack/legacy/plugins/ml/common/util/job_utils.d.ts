/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ValidationMessage {
  id: string;
}
export interface ValidationResults {
  messages: ValidationMessage[];
  valid: boolean;
  contains: (id: string) => boolean;
  find: (id: string) => ValidationMessage | undefined;
}
export function calculateDatafeedFrequencyDefaultSeconds(bucketSpanSeconds: number): number;

// TODO - use real types for job. Job interface first needs to move to a common location
export function isTimeSeriesViewJob(job: any): boolean;
export function basicJobValidation(
  job: any,
  fields: any[] | undefined,
  limits: any,
  skipMmlCheck?: boolean
): ValidationResults;

export const ML_MEDIAN_PERCENTS: number;

export const ML_DATA_PREVIEW_COUNT: number;

export function isJobIdValid(jobId: string): boolean;
