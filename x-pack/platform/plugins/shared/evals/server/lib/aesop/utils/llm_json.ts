/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helpers for pulling a JSON payload out of a free-form LLM response.
 *
 * Connectors and agents wrap their JSON in prose, code fences or reasoning
 * blocks, and may append text that itself contains brackets ("... see [docs]").
 * A greedy /\[[\s\S]*\]/ match spans from the first opening bracket to the last
 * closing bracket anywhere in the response, swallowing that trailing text, so
 * JSON.parse fails and a valid payload is silently discarded. Scanning for a
 * balanced pair instead stops at the end of the JSON value itself.
 */

const THINK_BLOCK_RE = / thinking[\s\S]*?<\/think>/g;
const JSON_FENCE_RE = /```json?\s*/g;
const FENCE_RE = /```\s*/g;

/** Removes reasoning blocks and markdown code fences from an LLM response. */
export function stripLlmWrappers(response: string): string {
  return response.replace(THINK_BLOCK_RE, '').replace(JSON_FENCE_RE, '').replace(FENCE_RE, '').trim();
}

/**
 * Returns the first balanced JSON array (`kind: 'array'`) or object
 * (`kind: 'object'`) found in `text`, or null when no complete pair exists.
 * String literals and escapes are skipped so brackets inside strings do not
 * unbalance the scan.
 */
export function extractJsonCandidate(text: string, kind: 'array' | 'object'): string | null {
  const open = kind === 'array' ? '[' : '{';
  const close = kind === 'array' ? ']' : '}';

  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === open) {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (char === close && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * Parses the JSON value carried by an LLM response: the whole (unwrapped)
 * response when it is valid JSON on its own, otherwise the first balanced
 * array/object of the requested kind. Returns null when neither parses.
 */
export function parseJsonFromLlmText<T = unknown>(response: string, kind: 'array' | 'object'): T | null {
  const cleaned = stripLlmWrappers(response);

  const direct = tryParse<T>(cleaned);
  if (direct.ok) {
    return direct.value;
  }

  const candidate = extractJsonCandidate(cleaned, kind);
  if (candidate === null) {
    return null;
  }

  const extracted = tryParse<T>(candidate);
  return extracted.ok ? extracted.value : null;
}

function tryParse<T>(text: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false };
  }
}
