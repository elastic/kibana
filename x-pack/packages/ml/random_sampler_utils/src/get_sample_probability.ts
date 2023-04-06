/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SAMPLE_PROBABILITY_MIN_DOC_COUNT = 50000;

// Trims the sample probability to the first non-zero digit.
function trimSampleProbability(x: number): number {
  return +x.toFixed(Math.max(-Math.log10(x) + 1, 1));
}

export function getSampleProbability(totalDocCount: number) {
  let sampleProbability = 1;

  if (totalDocCount > SAMPLE_PROBABILITY_MIN_DOC_COUNT) {
    sampleProbability = Math.min(0.5, SAMPLE_PROBABILITY_MIN_DOC_COUNT / totalDocCount);
  }

  return trimSampleProbability(sampleProbability);
}
