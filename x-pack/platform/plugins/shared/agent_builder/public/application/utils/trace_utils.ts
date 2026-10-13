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
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsText(file);
  });

export interface ParsedTraceFile {
  spans: TraceSpan[];
  traceId: string | undefined;
}

/**
 * Parses a JSON file and extracts TraceSpan objects and an optional trace ID.
 * Accepts either a bare TraceSpan[] or `{ trace_id?, spans: TraceSpan[] }` (our export format).
 * Returns null when the file is not a recognised trace format.
 */
export const parseTraceSpansFromFile = async (file: File): Promise<ParsedTraceFile | null> => {
  const text = await readFileAsText(file);
  const parsed: unknown = JSON.parse(text);

  const isSpan = (item: unknown): item is TraceSpan =>
    typeof item === 'object' && item !== null && 'span_id' in item;

  let spans: unknown;
  let traceId: string | undefined;

  if (Array.isArray(parsed)) {
    spans = parsed;
  } else if (parsed !== null && typeof parsed === 'object' && 'spans' in parsed) {
    const envelope = parsed as { spans: unknown; trace_id?: unknown };
    spans = envelope.spans;
    traceId = typeof envelope.trace_id === 'string' ? envelope.trace_id : undefined;
  } else {
    return null;
  }

  if (!Array.isArray(spans) || !spans.every(isSpan)) return null;

  return { spans, traceId };
};
