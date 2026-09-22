/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum number of log samples in a single upload request.
 */
export const UPLOAD_SAMPLES_MAX_LINES = 1000;

/**
 * Maximum characters per sample. Longer lines are omitted. Matches the upload API schema.
 */
export const UPLOAD_SAMPLES_MAX_LINE_LENGTH = 100_000;

/**
 * Maximum UTF-8 byte size of the upload JSON body. Must match the route `body.maxBytes`.
 * Default Kibana `server.maxPayload` is 1MB; without a route override, 1000 samples 413.
 */
export const UPLOAD_SAMPLES_MAX_REQUEST_BYTES = 10 * 1024 * 1024;

/**
 * Bytes reserved for JSON envelope keys, `originalSource`, and punctuation so the samples
 * array cannot consume the entire request budget.
 */
const UPLOAD_SAMPLES_JSON_ENVELOPE_RESERVE_BYTES = 8 * 1024;

const utf8Encoder = new TextEncoder();

const utf8ByteLength = (value: string): number => utf8Encoder.encode(value).length;

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
  // JSON array encoding: "[" + samples joined by "," + "]"
  let samplesJsonBytes = 2;
  const maxSamplesJsonBytes =
    UPLOAD_SAMPLES_MAX_REQUEST_BYTES - UPLOAD_SAMPLES_JSON_ENVELOPE_RESERVE_BYTES;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      if (trimmed.length > UPLOAD_SAMPLES_MAX_LINE_LENGTH) {
        linesOmittedOverLimit++;
      } else {
        const encodedSampleBytes = utf8ByteLength(JSON.stringify(trimmed));
        const extraBytes = (samples.length === 0 ? 0 : 1) + encodedSampleBytes;

        if (
          samples.length >= UPLOAD_SAMPLES_MAX_LINES ||
          samplesJsonBytes + extraBytes > maxSamplesJsonBytes
        ) {
          linesOmittedOverLimit++;
        } else {
          samplesJsonBytes += extraBytes;
          samples.push(trimmed);
        }
      }
    }
  }

  return { samples, linesOmittedOverLimit };
}
