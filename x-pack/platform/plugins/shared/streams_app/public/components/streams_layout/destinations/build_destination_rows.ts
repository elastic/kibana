/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import type { Destination, DestinationRow } from './types';

const TAG_QUERY_PREFIX = 'tag:';

export const matchesDestinationQuery = (destination: Destination, query: string): boolean => {
  if (!query) {
    return true;
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    if (token.startsWith(TAG_QUERY_PREFIX)) {
      const tag = token.slice(TAG_QUERY_PREFIX.length);
      if (tag === 'managed') {
        return destination.isManaged;
      }
      if (tag === 'internal') {
        return destination.isInternal;
      }
      return destination.tags.some((value) => value.toLowerCase() === tag);
    }

    return (
      destination.name.toLowerCase().includes(token) ||
      destination.description.toLowerCase().includes(token) ||
      destination.tags.some((value) => value.toLowerCase().includes(token))
    );
  });
};

export const buildDestinationRows = ({
  destinations,
  searchText,
  selectedQualities,
  docsByStream,
  ingestionByStream,
  storageByStream,
  qualityByStream,
}: {
  destinations: Destination[];
  searchText: string;
  selectedQualities: string[];
  docsByStream: Record<string, number>;
  ingestionByStream: Record<string, number>;
  storageByStream: Record<string, number>;
  qualityByStream: Record<string, QualityIndicators>;
}): DestinationRow[] => {
  const query = searchText.trim().toLowerCase();

  return destinations
    .filter((destination) => matchesDestinationQuery(destination, query))
    .map((destination) => ({
      ...destination,
      documentsCount: docsByStream[destination.name] ?? 0,
      ingestionRate: ingestionByStream[destination.name] ?? 0,
      storageBytes: storageByStream[destination.name] ?? 0,
      dataQuality: qualityByStream[destination.name],
    }))
    .filter(
      (row) =>
        selectedQualities.length === 0 ||
        (row.dataQuality !== undefined && selectedQualities.includes(row.dataQuality))
    );
};
