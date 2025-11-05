/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// work out the default frequency based on the bucket_span in seconds
export function calculateDatafeedFrequencyDefaultSeconds(bucketSpanSeconds: number): number {
  let freq = 3600;
  if (bucketSpanSeconds <= 120) {
    freq = 60;
  } else if (bucketSpanSeconds <= 1200) {
    freq = Math.floor(bucketSpanSeconds / 2);
  } else if (bucketSpanSeconds <= 43200) {
    freq = 600;
  }

  return freq;
}
