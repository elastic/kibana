/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype-only mock metadata for the redesigned Destinations table.
 *
 * The design mockup shows columns that don't exist in real stream data yet
 * (description, tags, ingestion rate, storage size). To make the table match
 * the design while staying deterministic across renders, we derive these
 * values from a stable hash of the stream name. Real values (docs, data
 * quality, retention) continue to come from the live stream data.
 */

const TAG_POOL = ['tag1', 'tag2', 'tag3'] as const;

export interface DestinationMockMetadata {
  description: string;
  isInternal: boolean;
  isManaged: boolean;
  tags: string[];
  /** Ingestion rate in documents per second. */
  ingestionRate: number;
  /** Storage size in bytes. */
  storageSizeBytes: number;
}

/** Simple deterministic string hash (djb2). */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getDestinationMockMetadata(streamName: string): DestinationMockMetadata {
  const hash = hashString(streamName);

  const isInternal = hash % 5 !== 0; // most are internal, some external
  const isManaged = hash % 2 === 0;

  // 1-3 deterministic tags.
  const tagCount = (hash % 3) + 1;
  const tags = TAG_POOL.slice(0, tagCount);

  // Ingestion rate between ~0 and ~100 docs/s, with one decimal.
  const ingestionRate = Math.round(((hash % 1000) / 10) * 10) / 10;

  // Storage size: derive a value in the tens-to-hundreds of GB range.
  const storageSizeBytes = (50 + (hash % 250)) * 1024 * 1024 * 1024;

  return {
    description: 'This is a description of the destination',
    isInternal,
    isManaged,
    tags,
    ingestionRate,
    storageSizeBytes,
  };
}
