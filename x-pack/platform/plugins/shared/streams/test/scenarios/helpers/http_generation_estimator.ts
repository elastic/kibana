/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Performance estimation utilities for HTTP access logs generation.
 */

/**
 * Estimate data size and generation time.
 */
export function estimateDataGeneration(params: {
  fromMs: number;
  toMs: number;
  scale: number;
  docsPerSecond?: number;
}): {
  estimatedDocs: number;
  estimatedSizeMB: number;
  estimatedTimeMinutes: number;
} {
  const { fromMs, toMs, scale, docsPerSecond = 100 } = params;
  const durationSeconds = (toMs - fromMs) / 1000;

  // Base rate: ~100 docs/sec at scale=1 in mixed mode
  const estimatedDocs = Math.round(durationSeconds * docsPerSecond * scale);

  // Average log size: ~1.5KB per document (ECS format with extended fields)
  const avgDocSizeKB = 1.5;
  const estimatedSizeMB = Math.round((estimatedDocs * avgDocSizeKB) / 1024);

  // Generation rate: ~10,000 docs/sec (conservative estimate)
  const generationRate = 10000;
  const estimatedTimeMinutes = Math.ceil(estimatedDocs / generationRate / 60);

  return {
    estimatedDocs,
    estimatedSizeMB,
    estimatedTimeMinutes,
  };
}
