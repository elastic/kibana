/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { getDestinationWritePatterns } from '../../../streams_layout/destinations/destination_models';
import type { DestinationViewModel } from '../../../streams_layout/destinations/types';

export type DestinationWriteScope = Pick<DestinationViewModel, 'signal' | 'mode' | 'index'>;

/** ES index-pattern glob: `*` is any sequence, `?` is one character. */
export const matchesIndexPattern = (name: string, pattern: string): boolean => {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`).test(name);
};

export const isClassicStreamCoveredByDestinations = (
  streamName: string,
  destinations: DestinationWriteScope[]
): boolean =>
  destinations.some((destination) =>
    getDestinationWritePatterns(destination).some((pattern) =>
      matchesIndexPattern(streamName, pattern)
    )
  );

/** Classic streams that would not appear in a unit destination's write-scope list. */
export const getUnownedClassicStreams = (
  streams: Streams.ClassicStream.Definition[],
  destinations: DestinationWriteScope[]
): Streams.ClassicStream.Definition[] =>
  streams.filter((stream) => !isClassicStreamCoveredByDestinations(stream.name, destinations));
