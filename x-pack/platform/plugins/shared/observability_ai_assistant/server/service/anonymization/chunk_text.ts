/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceChunk } from '../../../common/types';

/**
 * Splits text into chunks of specified maximum size
 *
 * Used to prepare text for ML model inference by breaking it into
 * smaller pieces that the model can handle efficiently.
 *
 * @param text - Text to be chunked
 * @param maxChars - Maximum characters per chunk (default: 1000)
 * @returns Array of chunks with their original character offsets
 */
export function chunkText(text: string, maxChars = 1_000): InferenceChunk[] {
  const chunks: InferenceChunk[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push({
      chunkText: text.slice(i, i + maxChars),
      charStartOffset: i,
    });
  }
  return chunks;
}
