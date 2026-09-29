/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Temporary mock metadata for the Destinations table.
 */

const TAG_POOL = ['tag1', 'tag2', 'tag3'] as const;

export interface DestinationMockMetadata {
  isInternal: boolean;
  isManaged: boolean;
  tags: string[];
}

export const getDestinationMockMetadata = (destinationName: string): DestinationMockMetadata => {
  const seed = [...destinationName].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    isInternal: seed % 5 !== 0,
    isManaged: seed % 2 === 0,
    tags: TAG_POOL.slice(0, (seed % TAG_POOL.length) + 1),
  };
};
