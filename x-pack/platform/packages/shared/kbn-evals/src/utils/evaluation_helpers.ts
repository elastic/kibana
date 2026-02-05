/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';

export const getStringMeta = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined => {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
};

export const getBooleanMeta = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
): boolean => metadata?.[key] === true;

export const extractAllStrings = (
  value: unknown,
  out: string[],
  maxStrings = 2000,
  maxLen = 500_000
) => {
  if (out.length >= maxStrings) return;

  if (typeof value === 'string') {
    if (value.length > 0) out.push(value.slice(0, maxLen));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractAllStrings(item, out, maxStrings, maxLen);
      if (out.length >= maxStrings) return;
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      extractAllStrings(v, out, maxStrings, maxLen);
      if (out.length >= maxStrings) return;
    }
  }
};

export const getToolCallSteps = (
  output: TaskOutput
): Array<{ tool_id?: string; results?: unknown[] }> => {
  const steps =
    (
      output as {
        steps?: Array<{ type?: string; tool_id?: string; results?: unknown[] }>;
      }
    )?.steps ?? [];

  return steps
    .filter((s) => s?.type === 'tool_call')
    .map((s) => ({ tool_id: s.tool_id, results: s.results }));
};

export const getFinalAssistantMessage = (output: TaskOutput): string => {
  const messages =
    (
      output as {
        messages?: Array<{ message?: string }>;
      }
    )?.messages ?? [];

  const last = messages[messages.length - 1];
  return typeof last?.message === 'string' ? last.message : '';
};

const compareSemver = (a: [number, number, number], b: [number, number, number]) => {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
};

export const extractMaxSemver = (text: string): string | undefined => {
  const re = /\b(\d+)\.(\d+)\.(\d+)\b/g;
  let match: RegExpExecArray | null;
  let best: { v: [number, number, number]; raw: string } | undefined;

  while ((match = re.exec(text))) {
    const v: [number, number, number] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (!best || compareSemver(v, best.v) > 0) {
      best = { v, raw: match[0] };
    }
  }

  return best?.raw;
};

export const extractReleaseDateNearVersion = (
  text: string,
  version: string
): string | undefined => {
  // Try to find a "released ..." date near the given version mention.
  const versionIdx = text.indexOf(version);
  const windows: Array<[number, number]> = [];

  if (versionIdx >= 0) {
    const start = Math.max(0, versionIdx - 400);
    const end = Math.min(text.length, versionIdx + 800);
    windows.push([start, end]);
  } else {
    windows.push([0, Math.min(text.length, 4000)]);
  }

  const datePattern =
    // e.g. "released on 2025-01-01", "released January 1, 2025"
    /\breleas(?:ed|e|ing)\b[\s\S]{0,80}?(?:on\s+)?((?:\d{4}-\d{2}-\d{2})|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4})/i;

  for (const [start, end] of windows) {
    const slice = text.slice(start, end);
    const m = slice.match(datePattern);
    if (m?.[1]) return m[1];
  }

  return undefined;
};

export const includesOneOf = (text: string, patterns: string[]): boolean => {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
};

export const containsAllTerms = (text: string, terms: string[]): boolean => {
  const lower = text.toLowerCase();
  return terms.every((t) => lower.includes(t.toLowerCase()));
};
