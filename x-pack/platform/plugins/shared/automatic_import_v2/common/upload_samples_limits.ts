/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseLogSamples, type ParseLogSamplesResult } from './file_parser';

/**
 * Maximum number of log samples in a single upload request.
 */
export const MAX_LOG_SAMPLES = 1000;

/**
 * Normalize log samples from file content using smart format detection.
 *
 * This function automatically detects the log format (NDJSON, JSON array, multiline JSON,
 * or line-based) and parses the content appropriately. This ensures that each sample
 * represents a complete log event, not just a line.
 *
 * @param content The raw file content
 * @returns Parsed samples with format detection metadata and any errors
 */
export function normalizeLogSamplesFromFileContent(content: string): ParseLogSamplesResult {
  return parseLogSamples(content);
}
