/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_AI_INDEX_ID_LENGTH, RECALL_AI_INDEX_PREFIX } from '../../common/constants';
import { AI_INDEX_ID_PATTERN } from '../../common/validation';

export type RecallAiIndexSelector =
  | { readonly kind: 'none' }
  | { readonly kind: 'all' }
  | { readonly kind: 'ids'; readonly ids: readonly string[] };

export interface ParsedRecallInclude {
  readonly sessionEvents: boolean;
  readonly sessionMemory: boolean;
  readonly aiIndices: RecallAiIndexSelector;
}

export type ParseRecallIncludeResult =
  | { readonly ok: true; readonly include: ParsedRecallInclude }
  | { readonly ok: false; readonly error: string };

/** Parses and validates the `include` store selectors for a recall request. */
export const parseRecallInclude = (entries: readonly string[]): ParseRecallIncludeResult => {
  if (entries.length === 0) {
    return { ok: false, error: 'include must name at least one recall store' };
  }

  let sessionEvents = false;
  let sessionMemory = false;
  let allAiIndices = false;
  const aiIndexIds = new Set<string>();

  for (const entry of entries) {
    if (entry === 'session_events') {
      sessionEvents = true;
    } else if (entry === 'session_memory') {
      sessionMemory = true;
    } else if (entry.startsWith(RECALL_AI_INDEX_PREFIX)) {
      const id = entry.slice(RECALL_AI_INDEX_PREFIX.length);
      if (id === '*') {
        allAiIndices = true;
      } else if (
        id.length === 0 ||
        id.length > MAX_AI_INDEX_ID_LENGTH ||
        !AI_INDEX_ID_PATTERN.test(id)
      ) {
        return {
          ok: false,
          error: `[${entry}] must be ai_index:* or ai_index:<id> with a valid AI index id of at most ${MAX_AI_INDEX_ID_LENGTH} characters`,
        };
      } else {
        aiIndexIds.add(id);
      }
    } else {
      return {
        ok: false,
        error: `[${entry}] is not a recall store: use session_events, session_memory, ai_index:* or ai_index:<id>`,
      };
    }
  }

  const aiIndices: RecallAiIndexSelector = allAiIndices
    ? { kind: 'all' }
    : aiIndexIds.size > 0
    ? { kind: 'ids', ids: [...aiIndexIds] }
    : { kind: 'none' };
  return { ok: true, include: { sessionEvents, sessionMemory, aiIndices } };
};

/** Validates a single `include` entry and returns an error message when invalid. */
export const validateRecallIncludeEntry = (entry: string): string | undefined => {
  const parsed = parseRecallInclude([entry]);
  return parsed.ok ? undefined : parsed.error;
};

/** Returns whether a parsed `include` selector queries any memory-backed session store. */
export const needsMemoryEnabled = ({
  sessionEvents,
  sessionMemory,
}: ParsedRecallInclude): boolean => sessionEvents || sessionMemory;
