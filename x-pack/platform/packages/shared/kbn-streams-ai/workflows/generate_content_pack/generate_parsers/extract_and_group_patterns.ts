/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, groupBy, mapValues, orderBy, shuffle, uniq } from 'lodash';
import { FlattenRecord } from '@kbn/streams-schema';

export function extractAndGroupPatterns(samples: FlattenRecord[], field: string) {
  const evalPattern = (sample: string) => {
    return sample
      .replace(/[ \t\n]+/g, ' ')
      .replace(/[A-Za-z]+/g, 'a')
      .replace(/[0-9]+/g, '0')
      .replace(/(a a)+/g, 'a')
      .replace(/(a0)+/g, 'f')
      .replace(/(f:)+/g, 'f:')
      .replace(/0(.0)+/g, 'p');
  };

  const NUMBER_PATTERN_CATEGORIES = 5;
  const NUMBER_SAMPLES_PER_PATTERN = 8;

  const samplesWithPatterns = samples.flatMap((sample) => {
    const value = get(sample, field);
    if (typeof value !== 'string') {
      return [];
    }
    const pattern = evalPattern(value);
    return [
      {
        document: sample,
        fullPattern: pattern,
        truncatedPattern: pattern.slice(0, 10),
        fieldValue: get(sample, field) as string,
      },
    ];
  });

  // Group samples by their truncated patterns
  const groupedByTruncatedPattern = groupBy(samplesWithPatterns, 'truncatedPattern');
  // Process each group to create pattern summaries
  const patternSummaries = mapValues(
    groupedByTruncatedPattern,
    (samplesForTruncatedPattern, truncatedPattern) => {
      const uniqueValues = uniq(samplesForTruncatedPattern.map(({ fieldValue }) => fieldValue));
      const shuffledExamples = shuffle(uniqueValues);

      return {
        truncatedPattern,
        count: samplesForTruncatedPattern.length,
        exampleValues: shuffledExamples.slice(0, NUMBER_SAMPLES_PER_PATTERN),
      };
    }
  );
  // Convert to array, sort by count, and take top patterns
  const patternsToProcess = orderBy(Object.values(patternSummaries), 'count', 'desc').slice(
    0,
    NUMBER_PATTERN_CATEGORIES
  );
  return patternsToProcess;
}
