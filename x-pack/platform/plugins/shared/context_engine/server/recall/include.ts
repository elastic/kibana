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

type ParsedEntry =
  | { readonly ok: true; readonly kind: 'session_events' | 'session_memory' | 'all_ai_indices' }
  | { readonly ok: true; readonly kind: 'ai_index'; readonly id: string }
  | { readonly ok: false; readonly error: string };

const parseRecallIncludeEntry = (entry: string): ParsedEntry => {
  if (entry === 'session_events' || entry === 'session_memory') {
    return { ok: true, kind: entry };
  }
  if (entry.startsWith(RECALL_AI_INDEX_PREFIX)) {
    const id = entry.slice(RECALL_AI_INDEX_PREFIX.length);
    if (id === '*') {
      return { ok: true, kind: 'all_ai_indices' };
    }
    if (id.length === 0 || id.length > MAX_AI_INDEX_ID_LENGTH || !AI_INDEX_ID_PATTERN.test(id)) {
      return {
        ok: false,
        error: `[${entry}] must be ai_index:* or ai_index:<id> with a valid AI index id of at most ${MAX_AI_INDEX_ID_LENGTH} characters`,
      };
    }
    return { ok: true, kind: 'ai_index', id };
  }
  return {
    ok: false,
    error: `[${entry}] is not a recall store: use session_events, session_memory, ai_index:* or ai_index:<id>`,
  };
};

export const parseRecallInclude = (entries: readonly string[]): ParseRecallIncludeResult => {
  if (entries.length === 0) {
    return { ok: false, error: 'include must name at least one recall store' };
  }

  let sessionEvents = false;
  let sessionMemory = false;
  let allAiIndices = false;
  const aiIndexIds = new Set<string>();

  for (const entry of entries) {
    const parsed = parseRecallIncludeEntry(entry);
    if (!parsed.ok) {
      return parsed;
    }
    switch (parsed.kind) {
      case 'session_events':
        sessionEvents = true;
        break;
      case 'session_memory':
        sessionMemory = true;
        break;
      case 'all_ai_indices':
        allAiIndices = true;
        break;
      case 'ai_index':
        aiIndexIds.add(parsed.id);
        break;
      default: {
        const exhaustive: never = parsed;
        throw new Error(`Unknown recall include entry: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  const aiIndices: RecallAiIndexSelector = allAiIndices
    ? { kind: 'all' }
    : aiIndexIds.size > 0
    ? { kind: 'ids', ids: [...aiIndexIds] }
    : { kind: 'none' };
  return { ok: true, include: { sessionEvents, sessionMemory, aiIndices } };
};

export const validateRecallIncludeEntry = (entry: string): string | undefined => {
  const parsed = parseRecallIncludeEntry(entry);
  return parsed.ok ? undefined : parsed.error;
};

export const needsMemoryEnabled = (entries: readonly string[]): boolean =>
  entries.some((entry) => entry === 'session_events' || entry === 'session_memory');
