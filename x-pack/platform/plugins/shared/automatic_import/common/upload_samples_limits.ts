/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum number of log lines in a single upload request.
 */
export const UPLOAD_SAMPLES_MAX_LINES = 1000;

export interface NormalizeLogSamplesResult {
  samples: string[];
  linesOmittedOverLimit: number;
}

export function normalizeLogSamplesFromFileContent(content: string): NormalizeLogSamplesResult {
  try {
    const parsed: unknown = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const lines = parsed.map((element) => JSON.stringify(element));
      return normalizeLogLinesForUpload(lines);
    }
  } catch {
    // Not valid JSON or not parseable as a single value; fall back to newline splitting.
  }
  return normalizeLogLinesForUpload(content.split('\n'));
}

export function normalizeLogLinesForUpload(lines: readonly string[]): NormalizeLogSamplesResult {
  const samples: string[] = [];
  let linesOmittedOverLimit = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      if (samples.length >= UPLOAD_SAMPLES_MAX_LINES) {
        linesOmittedOverLimit++;
      } else {
        samples.push(trimmed);
      }
    }
  }

  return { samples, linesOmittedOverLimit };
}
