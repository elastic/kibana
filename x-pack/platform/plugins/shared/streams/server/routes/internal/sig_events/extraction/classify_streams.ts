/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { minimatch } from 'minimatch';
import type { FeaturesRecencyResult } from '../../../../lib/sig_events/features/are_features_recent';

export interface StreamCandidate {
  streamName: string;
  lastCompletedAt: string | null;
}

export interface StreamClassificationResult {
  candidates: StreamCandidate[];
  upToDate: StreamCandidate[];
  excluded: string[];
  unsupported: string[];
  excludePatterns: string[];
}

export const parseExcludePatterns = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

const matchesExcludePatterns = (name: string, patterns: string[]): boolean =>
  patterns.some((pattern) => minimatch(name, pattern));

/**
 * Classifies streams into buckets (excluded, candidates, up-to-date)
 * using feature recency data to determine which streams need extraction.
 */
export const classifyStreams = ({
  allStreams,
  recencyByStream,
  excludedStreamPatterns,
}: {
  allStreams: Streams.all.Definition[];
  recencyByStream: Map<string, FeaturesRecencyResult>;
  excludedStreamPatterns: string;
}): StreamClassificationResult => {
  const excludePatterns = parseExcludePatterns(excludedStreamPatterns);

  const excluded: string[] = [];
  const unsupported: string[] = [];
  const candidates: StreamCandidate[] = [];
  const upToDate: StreamCandidate[] = [];

  for (const stream of allStreams) {
    if (
      !Streams.WiredStream.Definition.is(stream) &&
      !Streams.ClassicStream.Definition.is(stream)
    ) {
      unsupported.push(stream.name);
      continue;
    }
    if (matchesExcludePatterns(stream.name, excludePatterns)) {
      excluded.push(stream.name);
      continue;
    }

    const recency = recencyByStream.get(stream.name);

    if (!recency || !recency.isRecent) {
      candidates.push({
        streamName: stream.name,
        lastCompletedAt: recency?.newestLastSeen ?? null,
      });
    } else {
      upToDate.push({
        streamName: stream.name,
        lastCompletedAt: recency.newestLastSeen ?? null,
      });
    }
  }

  return {
    candidates,
    upToDate,
    excluded,
    unsupported,
    excludePatterns,
  };
};
