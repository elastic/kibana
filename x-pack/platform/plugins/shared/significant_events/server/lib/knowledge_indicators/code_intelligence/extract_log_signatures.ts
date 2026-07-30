/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_LOG_SEVERITY, LOG_LEVEL_SEVERITY } from './constants';
import type { LogSignature, LoggingChunk } from './types';

// Logger call with a severity method, e.g. `logger.error("...")`, `LOG.warn('...')`,
// `logging.warning("...")`, `console.error("...")`. Captures the level + the
// first string-literal argument.
const METHOD_CALL_RE =
  /(?:^|[^A-Za-z0-9_])(fatal|critical|severe|error|warn(?:ing)?|info|debug|trace|fine)\s*\(\s*(["'`])((?:\\.|(?!\2).)*)\2/gi;

// Rust-style level macro where the macro name *is* the level, e.g. `error!("...")`,
// `tracing::warn!("...")`.
const MACRO_CALL_RE =
  /(?:^|[^A-Za-z0-9_])(fatal|error|warn|info|debug|trace)\s*!\s*\(\s*(["'`])((?:\\.|(?!\2).)*)\2/gi;

// Placeholder / interpolation markers that end the static portion of a message.
const PLACEHOLDER_RE = /\{\}|\{\{|\{[^}]*\}|%[sdfvarx@]|\$\{|\$[A-Za-z_]|#\{/;

const normalizeLevel = (level: string): string => {
  const lower = level.toLowerCase();
  return lower === 'warning' ? 'warn' : lower;
};

const severityForLevel = (level: string): number =>
  LOG_LEVEL_SEVERITY[level] ?? DEFAULT_LOG_SEVERITY;

/**
 * The leading static text of a message, up to the first interpolation marker.
 * `"Payment failed for order {}"` -> `"Payment failed for order "`.
 */
export function staticPrefixOf(message: string): string {
  const match = PLACEHOLDER_RE.exec(message);
  const prefix = match ? message.slice(0, match.index) : message;
  return prefix.trim();
}

/**
 * Extracts log signatures (level + message + static prefix) from a logging
 * chunk's source. Deterministic regex over the code — no LLM.
 *
 * When the chunk carries a Stage-3 `classified` `(level, message)` (a phrase-only
 * match the idiom regex cannot parse — e.g. `fmt.Errorf("...")`), that is used to
 * synthesise the signature directly, so the recall lift still produces a query.
 * Otherwise the regex parses `(level, message)` from `content` as before.
 * De-duplicates by `(level, message)` within a chunk.
 */
export function extractLogSignatures(chunk: LoggingChunk): LogSignature[] {
  if (chunk.classified) {
    const level = normalizeLevel(chunk.classified.level);
    const message = chunk.classified.message;
    const staticPrefix = staticPrefixOf(message);
    if (staticPrefix.length < 3) {
      return [];
    }
    return [
      {
        level,
        severity: severityForLevel(level),
        message,
        staticPrefix,
        location: chunk.location,
      },
    ];
  }

  const signatures: LogSignature[] = [];
  const seen = new Set<string>();

  const collect = (re: RegExp) => {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(chunk.content)) !== null) {
      const level = normalizeLevel(match[1]);
      const message = match[3];
      const staticPrefix = staticPrefixOf(message);
      // Require a meaningful static anchor; a message that is entirely
      // interpolated cannot produce a stable predictive match.
      if (staticPrefix.length < 3) {
        continue;
      }
      const key = `${level}:${message}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      signatures.push({
        level,
        severity: severityForLevel(level),
        message,
        staticPrefix,
        location: chunk.location,
      });
    }
  };

  collect(METHOD_CALL_RE);
  collect(MACRO_CALL_RE);

  return signatures;
}
