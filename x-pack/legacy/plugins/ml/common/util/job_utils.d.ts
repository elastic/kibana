/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function calculateDatafeedFrequencyDefaultSeconds(bucketSpanSeconds: number): number;

export function isTimeSeriesViewJob(job: any): boolean;
export function basicJobValidation(
  job: any,
  fields: any[] | undefined,
  limits: any,
  skipMmlCheck?: boolean
): any[];

export const ML_MEDIAN_PERCENTS: number;

export const ML_DATA_PREVIEW_COUNT: number;
