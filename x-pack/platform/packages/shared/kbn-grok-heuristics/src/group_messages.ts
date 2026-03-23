/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, mapValues, orderBy } from 'lodash';

function evalPattern(sample: string) {
  return sample
    .replace(/[ \t\n]+/g, ' ')
    .replace(/[A-Za-z]+/g, 'a')
    .replace(/[0-9]+/g, '0')
    .replace(/(a a)+/g, 'a')
    .replace(/(a0)+/g, 'f')
    .replace(/(f:)+/g, 'f:')
    .replace(/0(.0)+/g, 'p');
}

export function groupMessagesByPattern(
  messages: string[],
  params?: {
    patternThreshold?: number;
    minProbability?: number;
    limit?: number;
  }
) {
  const { patternThreshold = 6, minProbability = 0.03, limit = 3 } = params ?? {};
  const samplesWithPatterns = messages.map((value) => {
    const pattern = evalPattern(value);
    return {
      pattern,
      truncatedPattern: pattern.slice(0, patternThreshold),
      value,
    };
  });

  // Group samples by their truncated patterns
  const groupedByTruncatedPattern = groupBy(samplesWithPatterns, 'truncatedPattern');

  // Process each group to create pattern summaries
  const patternSummaries = mapValues(
    groupedByTruncatedPattern,
    (samplesForTruncatedPattern, truncatedPattern) => {
      return {
        truncatedPattern,
        probability: samplesForTruncatedPattern.length / messages.length,
        messages: samplesForTruncatedPattern.map(({ value }) => value),
      };
    }
  );

  // Convert to array, sort by count, and take top patterns
  const patternsToProcess = orderBy(
    Object.values(patternSummaries).filter(({ probability }) => probability >= minProbability),
    'probability',
    'desc'
  );

  return patternsToProcess.slice(0, limit);
}
