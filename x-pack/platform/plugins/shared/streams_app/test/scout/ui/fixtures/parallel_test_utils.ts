/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/scout_test_file_naming */

import type { TestInfo } from '@kbn/scout';
import type { ApiServicesFixture } from '@kbn/scout';

/**
 * Utilities for making Scout tests parallel-safe.
 *
 * When running tests with multiple workers, each worker needs unique resource names
 * to avoid conflicts. These utilities help generate unique stream names and manage
 * cleanup without affecting other workers.
 */

/**
 * Generates a unique stream name for parallel test execution.
 * Uses workerIndex to ensure streams don't conflict across workers.
 *
 * @param testInfo - Playwright TestInfo object containing workerIndex
 * @param baseName - Base name for the stream (e.g., 'retention', 'routing')
 * @returns A unique stream name like 'logs.retention-w0'
 *
 * @example
 * ```ts
 * test.beforeEach(async ({ apiServices }, testInfo) => {
 *   const streamName = getUniqueStreamName(testInfo, 'my-test');
 *   // Creates: logs.my-test-w0, logs.my-test-w1, etc.
 * });
 * ```
 */
export function getUniqueStreamName(testInfo: TestInfo, baseName: string): string {
  return `logs.${baseName}-w${testInfo.workerIndex}`;
}

/**
 * Generates a unique classic stream name for parallel test execution.
 * Classic streams have a different naming pattern (no 'logs.' prefix in the parent).
 *
 * @param testInfo - Playwright TestInfo object containing workerIndex
 * @param baseName - Base name for the stream
 * @returns A unique classic stream name like 'logs-my-test-w0'
 */
export function getUniqueClassicStreamName(testInfo: TestInfo, baseName: string): string {
  return `logs-${baseName}-w${testInfo.workerIndex}`;
}

/**
 * Generates a unique nested stream name for parallel test execution.
 *
 * @param testInfo - Playwright TestInfo object containing workerIndex
 * @param baseName - Base name for the parent stream
 * @param childName - Name for the child stream
 * @returns A unique nested stream name like 'logs.parent-w0.child'
 */
export function getUniqueNestedStreamName(
  testInfo: TestInfo,
  baseName: string,
  childName: string
): string {
  return `logs.${baseName}-w${testInfo.workerIndex}.${childName}`;
}

/**
 * Safely deletes a stream, ignoring errors if it doesn't exist.
 *
 * @param apiServices - Scout API services fixture
 * @param streamName - Name of the stream to delete
 */
export async function safeDeleteStream(
  apiServices: ApiServicesFixture,
  streamName: string
): Promise<void> {
  try {
    await apiServices.streams.deleteStream(streamName);
  } catch {
    // Stream might not exist, that's fine
  }
}

/**
 * Safely clears stream processors, ignoring errors if the stream doesn't exist.
 *
 * @param apiServices - Scout API services fixture
 * @param streamName - Name of the stream
 */
export async function safeClearStreamProcessors(
  apiServices: ApiServicesFixture,
  streamName: string
): Promise<void> {
  try {
    await apiServices.streams.clearStreamProcessors(streamName);
  } catch {
    // Stream might not exist or have no processors
  }
}

/**
 * Safely clears stream mappings, ignoring errors if the stream doesn't exist.
 *
 * @param apiServices - Scout API services fixture
 * @param streamName - Name of the stream
 */
export async function safeClearStreamMappings(
  apiServices: ApiServicesFixture,
  streamName: string
): Promise<void> {
  try {
    await apiServices.streams.clearStreamMappings(streamName);
  } catch {
    // Stream might not exist or have no mappings
  }
}

/**
 * Creates a test stream with a unique name for parallel execution.
 * Handles cleanup of any existing stream with the same name first.
 *
 * @param apiServices - Scout API services fixture
 * @param testInfo - Playwright TestInfo object
 * @param baseName - Base name for the stream
 * @param condition - Routing condition for the stream
 * @returns The created stream name
 */
export async function createUniqueTestStream(
  apiServices: ApiServicesFixture,
  testInfo: TestInfo,
  baseName: string,
  condition: { field: string; eq: string }
): Promise<string> {
  const streamName = getUniqueStreamName(testInfo, baseName);

  // Clean up any existing stream from previous runs
  await safeDeleteStream(apiServices, streamName);

  // Create the new stream
  await apiServices.streams.forkStream('logs', streamName, condition);

  return streamName;
}

/**
 * Creates multiple unique child streams under 'logs' for parallel execution.
 *
 * @param apiServices - Scout API services fixture
 * @param testInfo - Playwright TestInfo object
 * @param baseName - Base name prefix for streams
 * @param children - Array of child configurations
 * @returns Array of created stream names
 */
export async function createUniqueChildStreams(
  apiServices: ApiServicesFixture,
  testInfo: TestInfo,
  baseName: string,
  children: Array<{ suffix: string; condition: { field: string; eq: string } }>
): Promise<string[]> {
  const streamNames: string[] = [];

  for (const child of children) {
    const streamName = getUniqueStreamName(testInfo, `${baseName}-${child.suffix}`);
    await safeDeleteStream(apiServices, streamName);
    await apiServices.streams.forkStream('logs', streamName, child.condition);
    streamNames.push(streamName);
  }

  return streamNames;
}

/**
 * Cleans up all streams created by a specific worker.
 *
 * @param apiServices - Scout API services fixture
 * @param streamNames - Array of stream names to delete
 */
export async function cleanupTestStreams(
  apiServices: ApiServicesFixture,
  streamNames: string[]
): Promise<void> {
  // Delete in reverse order (children first, then parents)
  for (const streamName of [...streamNames].reverse()) {
    await safeDeleteStream(apiServices, streamName);
  }
}
