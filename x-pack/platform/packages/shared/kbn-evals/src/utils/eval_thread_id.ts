/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { v5 } from 'uuid';

/**
 * Namespace UUID for generating deterministic eval thread IDs.
 * Uses a fixed namespace to ensure consistent IDs across runs.
 */
const EVAL_THREAD_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export interface GenerateEvalThreadIdOptions {
  /**
   * Dataset name for deterministic ID generation.
   */
  datasetName?: string;
  /**
   * Example index within the dataset (0-based).
   */
  exampleIndex?: number;
  /**
   * Repetition number for repeated runs.
   */
  repetition?: number;
  /**
   * Run ID for additional uniqueness in deterministic generation.
   */
  runId?: string;
  /**
   * Optional custom seed for deterministic generation.
   * When provided, overrides the default seed composition.
   */
  seed?: string;
}

/**
 * Generates a unique thread ID for evaluation runs.
 *
 * This utility supports two modes:
 * 1. **Random mode** (no options): Generates a cryptographically random UUID.
 * 2. **Deterministic mode** (with options): Generates a consistent UUID based on
 *    the provided parameters, useful for correlating runs across systems.
 *
 * @example
 * // Random thread ID
 * const threadId = generateEvalThreadId();
 *
 * @example
 * // Deterministic thread ID based on evaluation context
 * const threadId = generateEvalThreadId({
 *   datasetName: 'my-dataset',
 *   exampleIndex: 0,
 *   repetition: 1,
 *   runId: 'run-123',
 * });
 *
 * @example
 * // Deterministic thread ID with custom seed
 * const threadId = generateEvalThreadId({ seed: 'my-custom-seed' });
 */
export function generateEvalThreadId(options?: GenerateEvalThreadIdOptions): string {
  // If no options provided, generate a random UUID
  if (!options) {
    return randomUUID();
  }

  const { datasetName, exampleIndex, repetition, runId, seed } = options;

  // If a custom seed is provided, use it directly
  if (seed) {
    return v5(seed, EVAL_THREAD_NAMESPACE);
  }

  // If no meaningful options are provided, fall back to random
  if (
    datasetName === undefined &&
    exampleIndex === undefined &&
    repetition === undefined &&
    runId === undefined
  ) {
    return randomUUID();
  }

  // Compose a deterministic seed from the provided options
  const seedParts: string[] = [];

  if (datasetName !== undefined) {
    seedParts.push(`dataset:${datasetName}`);
  }
  if (exampleIndex !== undefined) {
    seedParts.push(`example:${exampleIndex}`);
  }
  if (repetition !== undefined) {
    seedParts.push(`rep:${repetition}`);
  }
  if (runId !== undefined) {
    seedParts.push(`run:${runId}`);
  }

  const composedSeed = seedParts.join('|');
  return v5(composedSeed, EVAL_THREAD_NAMESPACE);
}

/**
 * Validates whether a string is a valid eval thread ID format (UUID).
 *
 * @param threadId - The thread ID to validate
 * @returns true if the thread ID is a valid UUID format
 */
export function isValidEvalThreadId(threadId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(threadId);
}

/**
 * Parses components from a deterministic eval thread ID seed.
 * Useful for debugging or understanding how a thread ID was generated.
 *
 * Note: This only works if you have the original seed string.
 * The UUID itself cannot be reversed to obtain the original components.
 *
 * @param seed - The seed string used to generate the thread ID
 * @returns Parsed components or null if the seed format is invalid
 */
export function parseEvalThreadIdSeed(
  seed: string
): { datasetName?: string; exampleIndex?: number; repetition?: number; runId?: string } | null {
  const parts = seed.split('|');
  const result: {
    datasetName?: string;
    exampleIndex?: number;
    repetition?: number;
    runId?: string;
  } = {};

  for (const part of parts) {
    const [key, value] = part.split(':');
    switch (key) {
      case 'dataset':
        result.datasetName = value;
        break;
      case 'example':
        result.exampleIndex = parseInt(value, 10);
        break;
      case 'rep':
        result.repetition = parseInt(value, 10);
        break;
      case 'run':
        result.runId = value;
        break;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}
