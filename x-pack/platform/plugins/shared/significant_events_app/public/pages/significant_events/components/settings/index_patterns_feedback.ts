/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, streamMatchesIndexPatterns } from '@kbn/streams-schema';

export interface IndexPatternsMatchSummary {
  matchedStreamCount: number;
  unmatchedPatterns: string[];
  queryStreamCount: number;
}

/**
 * Summarizes how the index-patterns setting matches current streams. Pattern
 * matching is purely name-based, using the same glob as onboarding and the
 * discovery list: a stream is counted when its name matches any pattern, and a
 * pattern is flagged when no current stream name matches it. So the count and the
 * unmatched list always describe the same population and can't contradict each
 * other.
 *
 * Patterns are forward-looking, so an unmatched pattern is a warning (it may
 * match streams created later), not an error. Query streams are eligible for
 * onboarding independent of patterns (when query streams are enabled), so they
 * are reported separately as `queryStreamCount` rather than folded into the
 * pattern match count.
 */
export const summarizeIndexPatternsMatch = (
  patterns: string[],
  streams: Streams.all.Definition[]
): IndexPatternsMatchSummary => {
  const matchedStreamCount = streams.filter((stream) =>
    streamMatchesIndexPatterns(stream.name, patterns)
  ).length;

  const queryStreamCount = streams.filter((stream) =>
    Streams.QueryStream.Definition.is(stream)
  ).length;

  const streamNames = streams.map((stream) => stream.name);
  const unmatchedPatterns = patterns.filter(
    (pattern) => !streamNames.some((name) => streamMatchesIndexPatterns(name, [pattern]))
  );

  return { matchedStreamCount, unmatchedPatterns, queryStreamCount };
};
