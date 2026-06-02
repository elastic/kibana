/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

/**
 * Parses an Agent Builder agent response into an array of skill objects.
 *
 * Handles three real-world cases:
 *   1. Well-formed JSON array (fast path).
 *   2. Truncated array — Opus-class models sometimes hit `max_tokens`
 *      mid-array, leaving a half-written tail object. We bracket-balance scan
 *      and recover every complete top-level object.
 *   3. Total junk — returns `[]` and logs an error.
 *
 * Extracted from `AgentOrchestrator` so it can be unit-tested without booting
 * the full agent pipeline (see `skill_response_parser.test.ts`).
 */
export function parseSkillsFromResponse(response: string, logger: Logger): unknown[] {
  const cleaned = response
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```json?\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // Fast path: well-formed JSON array.
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to salvage parser.
    }
  }

  const salvaged = salvageObjects(cleaned);
  if (salvaged.length > 0) {
    logger.warn(
      `[AESOP] Skill response was truncated; salvaged ${salvaged.length} complete skill(s) from partial JSON`
    );
    return salvaged;
  }

  logger.error('[AESOP] Failed to parse skills from agent response');
  return [];
}

/**
 * Walk the buffer, track `{}` depth + string state, and `JSON.parse` each
 * top-level object as it closes. Anything after the last successful close
 * (typically a half-written tail object) is dropped.
 *
 * Exported separately so callers that already know they have a partial array
 * (e.g. retry logic) can skip the array-detection step.
 */
export function salvageObjects(buffer: string): unknown[] {
  const out: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const slice = buffer.slice(start, i + 1);
        try {
          out.push(JSON.parse(slice));
        } catch {
          // Skip malformed object; keep scanning.
        }
        start = -1;
      }
    }
  }

  return out;
}
