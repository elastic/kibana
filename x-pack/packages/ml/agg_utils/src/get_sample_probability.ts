/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SAMPLE_PROBABILITY_MIN_DOC_COUNT = 50000;

export function getSampleProbability(totalDocCount: number) {
  let sampleProbability = 1;

  if (totalDocCount > SAMPLE_PROBABILITY_MIN_DOC_COUNT) {
    sampleProbability = Math.min(0.5, SAMPLE_PROBABILITY_MIN_DOC_COUNT / totalDocCount);
  }

  return sampleProbability;
}
