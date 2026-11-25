/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_AI_INDEX_ID_LENGTH, RECALL_AI_INDEX_PREFIX } from '../../common/constants';
import { RECALL_SESSION_STORES, type RecallSessionStore } from '../../common/http_api/recall';
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

type IncludeEntry =
  | { readonly kind: RecallSessionStore }
  | { readonly kind: 'ai_index_all' }
  | { readonly kind: 'ai_index'; readonly id: string }
  | { readonly kind: 'invalid'; readonly error: string };

const AI_INDEX_WILDCARD = '*';
const SESSION_STORE_SET: ReadonlySet<string> = new Set(RECALL_SESSION_STORES);

const isSessionStore = (entry: string): entry is RecallSessionStore => SESSION_STORE_SET.has(entry);

const parseEntry = (entry: string): IncludeEntry => {
  if (isSessionStore(entry)) {
    return { kind: entry };
  }
  if (!entry.startsWith(RECALL_AI_INDEX_PREFIX)) {
    return {
      kind: 'invalid',
      error: `[${entry}] is not a recall store: use session_events, session_memory, ai_index:* or ai_index:<id>`,
    };
  }
  const id = entry.slice(RECALL_AI_INDEX_PREFIX.length);
  if (id === AI_INDEX_WILDCARD) {
    return { kind: 'ai_index_all' };
  }
  if (id.length === 0 || id.length > MAX_AI_INDEX_ID_LENGTH || !AI_INDEX_ID_PATTERN.test(id)) {
    return {
      kind: 'invalid',
      error: `[${entry}] must be ai_index:* or ai_index:<id> with a valid AI index id of at most ${MAX_AI_INDEX_ID_LENGTH} characters`,
    };
  }
  return { kind: 'ai_index', id };
};

export const validateRecallIncludeEntry = (entry: string): string | undefined => {
  const parsed = parseEntry(entry);
  return parsed.kind === 'invalid' ? parsed.error : undefined;
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
    const parsed = parseEntry(entry);
    switch (parsed.kind) {
      case 'session_events':
        sessionEvents = true;
        break;
      case 'session_memory':
        sessionMemory = true;
        break;
      case 'ai_index_all':
        allAiIndices = true;
        break;
      case 'ai_index':
        aiIndexIds.add(parsed.id);
        break;
      case 'invalid':
        return { ok: false, error: parsed.error };
      default: {
        const exhaustive: never = parsed;
        throw new Error(`Unhandled include entry ${JSON.stringify(exhaustive)}`);
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

export const needsMemoryEnabled = ({
  sessionEvents,
  sessionMemory,
}: ParsedRecallInclude): boolean => sessionEvents || sessionMemory;
