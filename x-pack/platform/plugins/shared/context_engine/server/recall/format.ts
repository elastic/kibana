/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import { DEFAULT_RECALL_FORMAT, RECALL_AI_INDEX_PREFIX } from '../../common/constants';
import type { AiIndexRecallResult, RecallFormat, RecallResult } from '../../common/http_api/recall';

const YAML_RESULTS_HEADER = 'results:\n';

/** `lineWidth: 0` keeps long lines unwrapped; no aliases so shared objects never become anchors. */
const YAML_OPTIONS = { lineWidth: 0, aliasDuplicateObjects: false } as const;

/** V1 default: naive character-to-token ratio mirroring `server/dreaming/trace_batches.ts`. */
const CHARS_PER_TOKEN = 4;

const estimateTokens = (charLength: number): number => Math.ceil(charLength / CHARS_PER_TOKEN);

const isAiIndexResult = (result: RecallResult): result is AiIndexRecallResult =>
  result.source.startsWith(RECALL_AI_INDEX_PREFIX);

const normalizeRecallResult = (result: RecallResult): RecallResult => {
  if (result.source === 'session_events') {
    const { id, session_id: sessionId, source, date, role, content } = result;
    return { id, session_id: sessionId, source, date, role, content };
  }
  if (result.source === 'session_memory') {
    const { id, session_id: sessionId, source, date, content, attributes } = result;
    return {
      id,
      session_id: sessionId,
      source,
      date,
      content,
      ...(attributes && Object.keys(attributes).length > 0 && { attributes }),
    };
  }
  if (isAiIndexResult(result)) {
    const { id, source, date, content, attributes } = result;
    return {
      id,
      source,
      ...(date !== undefined && { date }),
      content,
      ...(attributes && Object.keys(attributes).length > 0 && { attributes }),
    };
  }
  const exhaustive: never = result;
  throw new Error(`Unsupported recall result ${JSON.stringify(exhaustive)}`);
};

const serializedItemChars = (normalized: RecallResult, format: RecallFormat): number => {
  switch (format) {
    case 'yaml':
      return stringify({ results: [normalized] }, YAML_OPTIONS).length - YAML_RESULTS_HEADER.length;
    case 'json':
      return JSON.stringify(normalized).length;
    default: {
      const exhaustive: never = format;
      throw new Error(`Unsupported recall format ${exhaustive}`);
    }
  }
};

export interface PackedRecallResults {
  readonly results: RecallResult[];
  readonly tokensReturned: number;
}

/** Formats recall results as canonical YAML under a top-level `results` key. */
export const formatRecallYaml = (results: readonly RecallResult[]): string =>
  stringify({ results: results.map(normalizeRecallResult) }, YAML_OPTIONS);

/**
 * V1 default: packs whole results in reranked order without truncation, always keeping result #1
 * even when it exceeds `tokenBudget`, and stops on the first later result that overflows.
 */
export const packRecallResults = ({
  results,
  tokenBudget,
  format = DEFAULT_RECALL_FORMAT,
}: {
  results: readonly RecallResult[];
  tokenBudget: number;
  format?: RecallFormat;
}): PackedRecallResults => {
  if (results.length === 0) {
    return { results: [], tokensReturned: 0 };
  }

  const separator = format === 'yaml' ? 0 : 1;
  let totalChars = format === 'yaml' ? YAML_RESULTS_HEADER.length : 2;
  const packed: RecallResult[] = [];

  for (const result of results) {
    const normalized = normalizeRecallResult(result);
    const nextChars =
      totalChars + (packed.length > 0 ? separator : 0) + serializedItemChars(normalized, format);
    if (packed.length > 0 && estimateTokens(nextChars) > tokenBudget) {
      break;
    }
    packed.push(normalized);
    totalChars = nextChars;
  }
  return { results: packed, tokensReturned: estimateTokens(totalChars) };
};
