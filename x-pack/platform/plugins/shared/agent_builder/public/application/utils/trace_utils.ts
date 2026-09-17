/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceSpan } from '@kbn/llm-trace-waterfall';

/** Normalises the backend's `string | string[]` trace_id shape to a single id. */
export const normalizeTraceId = (raw: string | string[] | null | undefined): string | undefined => {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
};

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('FileReader did not return a string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsText(file);
  });

/**
 * Parses a JSON file and extracts an array of TraceSpan objects.
 * Accepts either a bare TraceSpan[] or `{ spans: TraceSpan[] }` (our export format).
 * Returns null when the file is not a recognised trace format.
 */
export const parseTraceSpansFromFile = async (file: File): Promise<TraceSpan[] | null> => {
  const text = await readFileAsText(file);
  const parsed: unknown = JSON.parse(text);

  const spans: unknown = Array.isArray(parsed)
    ? parsed
    : parsed !== null && typeof parsed === 'object' && 'spans' in parsed
    ? (parsed as { spans: unknown }).spans
    : null;

  if (!Array.isArray(spans)) return null;

  const firstItem = (spans as unknown[])[0];
  const isValid =
    firstItem === undefined ||
    (typeof firstItem === 'object' && firstItem !== null && 'span_id' in firstItem);

  return isValid ? (spans as TraceSpan[]) : null;
};
