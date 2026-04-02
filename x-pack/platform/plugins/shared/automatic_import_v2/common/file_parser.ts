/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash/fp';
import { MAX_LOG_SAMPLES } from './upload_samples_limits';

/**
 * Detected log format types that the parser can identify.
 */
export type DetectedLogFormat =
  | 'ndjson' // One JSON object per line
  | 'ndjson_multiline' // JSON objects spanning multiple lines (split on \n{)
  | 'json_array' // JSON array of objects
  | 'line_based'; // Default: one log per line (CSV, syslog, unstructured, etc.)

export type ParseErrorType = 'EMPTY' | 'NOT_ARRAY' | 'NOT_OBJECT' | 'TOO_LARGE_TO_PARSE';

export interface ParseLogSamplesResult {
  /** The parsed log samples (each element is one log event) */
  samples: string[];
  /** The detected format of the logs */
  detectedFormat: DetectedLogFormat;
  /** Number of samples omitted due to the max limit */
  samplesOmittedOverLimit: number;
  /** Optional path to entries for JSON array format (e.g., ['data', 'events']) */
  jsonPath?: string[];
  /** Warnings encountered during parsing */
  warnings: string[];
  /** Error if parsing failed (matches AIV1 behavior) */
  error?: ParseErrorType;
}

/**
 * Parse the logs sample file content as newline-delimited JSON (NDJSON).
 *
 * This supports multiline JSON objects if passed multiline flag.
 * Note that in multiline mode, the { character must appear at the beginning of the
 * line if and only if it denotes the start of a new JSON object.
 *
 * @param fileContent The content of the file
 * @param multiline Whether to handle multiline JSON objects
 * @returns Array of parsed JSON objects
 */
export function parseNDJSON(fileContent: string, multiline: boolean = false): unknown[] {
  const separator = multiline ? /\n(?=\{)/ : '\n';

  return fileContent
    .split(separator)
    .filter((entry) => entry.trim() !== '')
    .map((entry) => JSON.parse(entry));
}

/**
 * Parse the logs sample file content as JSON, finding an array of entries.
 *
 * If the JSON object can be parsed but is not an array, we try to find a candidate
 * among the dictionary keys (it must be identifier-like and its value must be an array).
 *
 * @param fileContent The content of the file
 * @returns The parsed entries, path to entries, and whether an array was found
 */
export function parseJSONArray(fileContent: string): {
  entries: unknown[];
  pathToEntries: string[];
  errorNoArrayFound: boolean;
} {
  const jsonContent = JSON.parse(fileContent);
  if (Array.isArray(jsonContent)) {
    return { entries: jsonContent, pathToEntries: [], errorNoArrayFound: false };
  }
  if (typeof jsonContent === 'object' && jsonContent !== null) {
    const arrayKeys = Object.keys(jsonContent).filter((key) => Array.isArray(jsonContent[key]));
    if (arrayKeys.length === 1) {
      const key = arrayKeys[0];
      return {
        entries: jsonContent[key],
        pathToEntries: [key],
        errorNoArrayFound: false,
      };
    }
  }
  return { errorNoArrayFound: true, entries: [], pathToEntries: [] };
}

/**
 * Validates that all entries in an array are plain objects.
 */
function validateObjectEntries(entries: unknown[]): boolean {
  return entries.every((entry) => isPlainObject(entry));
}

/**
 * Parse log samples from file content, automatically detecting the format.
 *
 * Parsing strategy (in order of precedence):
 * 1. Try JSON array (array of objects, or object with a single array property)
 * 2. Try NDJSON (one JSON object per line)
 * 3. Try multiline NDJSON (JSON objects split on \n{)
 * 4. Fall back to line-based (one log per line)
 *
 * Note: JSON array is checked FIRST because a single-line JSON array or object
 * with nested array would otherwise be detected as NDJSON.
 *
 * @param fileContent The raw file content
 * @returns ParseLogSamplesResult with samples and detected format
 */
export function parseLogSamples(fileContent: string): ParseLogSamplesResult {
  const maxSamples = MAX_LOG_SAMPLES;
  const warnings: string[] = [];
  let parsedContent: unknown[];

  const trimmedContent = fileContent.trim();

  if (trimmedContent.length === 0) {
    return {
      samples: [],
      detectedFormat: 'line_based',
      samplesOmittedOverLimit: 0,
      warnings: [],
      error: 'EMPTY',
    };
  }

  try {
    parsedContent = parseNDJSON(fileContent);

    if (parsedContent.length === 1 && Array.isArray(parsedContent[0])) {
      const arrayEntries = parsedContent[0] as unknown[];
      if (arrayEntries.length === 0) {
        return {
          samples: [],
          detectedFormat: 'json_array',
          samplesOmittedOverLimit: 0,
          jsonPath: [],
          warnings: [],
          error: 'EMPTY',
        };
      }
      if (!validateObjectEntries(arrayEntries)) {
        return {
          samples: [],
          detectedFormat: 'json_array',
          samplesOmittedOverLimit: 0,
          jsonPath: [],
          warnings: [],
          error: 'NOT_OBJECT',
        };
      }
      return finalizeResult(arrayEntries, 'json_array', maxSamples, [], warnings);
    }

    if (parsedContent.length > 0 && !validateObjectEntries(parsedContent)) {
      return {
        samples: [],
        detectedFormat: 'ndjson',
        samplesOmittedOverLimit: 0,
        warnings: [],
        error: 'NOT_OBJECT',
      };
    }

    if (parsedContent.length > 0) {
      return finalizeResult(parsedContent, 'ndjson', maxSamples, undefined, warnings);
    }
  } catch (ndjsonError) {
    if (ndjsonError instanceof RangeError) {
      return {
        samples: [],
        detectedFormat: 'line_based',
        samplesOmittedOverLimit: 0,
        warnings: [],
        error: 'TOO_LARGE_TO_PARSE',
      };
    }
  }

  try {
    const { entries, pathToEntries, errorNoArrayFound } = parseJSONArray(trimmedContent);

    if (errorNoArrayFound) {
      return {
        samples: [],
        detectedFormat: 'line_based',
        samplesOmittedOverLimit: 0,
        warnings: [],
        error: 'NOT_ARRAY',
      };
    }

    if (entries.length === 0) {
      return {
        samples: [],
        detectedFormat: 'json_array',
        samplesOmittedOverLimit: 0,
        jsonPath: pathToEntries.length > 0 ? pathToEntries : [],
        warnings: [],
        error: 'EMPTY',
      };
    }

    if (!validateObjectEntries(entries)) {
      return {
        samples: [],
        detectedFormat: 'json_array',
        samplesOmittedOverLimit: 0,
        jsonPath: pathToEntries.length > 0 ? pathToEntries : [],
        warnings: [],
        error: 'NOT_OBJECT',
      };
    }

    return finalizeResult(
      entries,
      'json_array',
      maxSamples,
      pathToEntries.length > 0 ? pathToEntries : [],
      warnings
    );
  } catch (jsonError) {
    if (jsonError instanceof RangeError) {
      return {
        samples: [],
        detectedFormat: 'line_based',
        samplesOmittedOverLimit: 0,
        warnings: [],
        error: 'TOO_LARGE_TO_PARSE',
      };
    }
  }

  try {
    parsedContent = parseNDJSON(fileContent, true);

    if (parsedContent.length > 0) {
      if (!validateObjectEntries(parsedContent)) {
        return {
          samples: [],
          detectedFormat: 'ndjson_multiline',
          samplesOmittedOverLimit: 0,
          warnings: [],
          error: 'NOT_OBJECT',
        };
      }
      return finalizeResult(parsedContent, 'ndjson_multiline', maxSamples, undefined, warnings);
    }
  } catch (multilineError) {
    if (multilineError instanceof RangeError) {
      return {
        samples: [],
        detectedFormat: 'line_based',
        samplesOmittedOverLimit: 0,
        warnings: [],
        error: 'TOO_LARGE_TO_PARSE',
      };
    }
  }

  // Fall back to line-based parsing
  const lines = fileContent.split('\n').filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return {
      samples: [],
      detectedFormat: 'line_based',
      samplesOmittedOverLimit: 0,
      warnings: [],
      error: 'EMPTY',
    };
  }

  return finalizeLineBasedResult(lines, maxSamples, warnings);
}

/**
 * Finalize the result for JSON-based formats.
 */
function finalizeResult(
  entries: unknown[],
  detectedFormat: DetectedLogFormat,
  maxSamples: number,
  jsonPath: string[] | undefined,
  warnings: string[]
): ParseLogSamplesResult {
  const samplesOmittedOverLimit = Math.max(0, entries.length - maxSamples);
  const limitedEntries = entries.slice(0, maxSamples);

  // Convert entries to strings (JSON stringify for objects, toString for primitives)
  const samples = limitedEntries.map((entry) =>
    typeof entry === 'object' && entry !== null ? JSON.stringify(entry) : String(entry)
  );

  if (samplesOmittedOverLimit > 0) {
    warnings.push(
      `${samplesOmittedOverLimit} log entries were omitted because they exceed the maximum of ${maxSamples}.`
    );
  }

  return {
    samples,
    detectedFormat,
    samplesOmittedOverLimit,
    jsonPath,
    warnings,
  };
}

/**
 * Finalize the result for line-based format.
 */
function finalizeLineBasedResult(
  lines: string[],
  maxSamples: number,
  warnings: string[]
): ParseLogSamplesResult {
  const samplesOmittedOverLimit = Math.max(0, lines.length - maxSamples);
  const samples = lines.slice(0, maxSamples).map((line) => line.trim());

  if (samplesOmittedOverLimit > 0) {
    warnings.push(
      `${samplesOmittedOverLimit} log lines were omitted because they exceed the maximum of ${maxSamples}.`
    );
  }

  return {
    samples,
    detectedFormat: 'line_based',
    samplesOmittedOverLimit,
    warnings,
  };
}

/**
 * Get a human-readable description of the detected format.
 */
export function getFormatDescription(format: DetectedLogFormat): string {
  switch (format) {
    case 'ndjson':
      return 'Newline-delimited JSON (NDJSON)';
    case 'ndjson_multiline':
      return 'Multi-line JSON objects';
    case 'json_array':
      return 'JSON array';
    case 'line_based':
      return 'Line-based logs';
  }
}
