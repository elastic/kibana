/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import { RECALL_AI_INDEX_PREFIX } from '../../common/constants';
import type { AiIndexRecallResult, RecallFormat, RecallResult } from '../../common/http_api/recall';

const YAML_RESULTS_HEADER = 'results:\n';

/** `lineWidth: 0` keeps long lines unwrapped; no aliases so shared objects never become anchors. */
const YAML_OPTIONS = { lineWidth: 0, aliasDuplicateObjects: false } as const;

const hasEntries = (attributes: object | undefined): boolean =>
  attributes !== undefined && Object.keys(attributes).length > 0;

const isAiIndexResult = (result: RecallResult): result is AiIndexRecallResult =>
  result.source.startsWith(RECALL_AI_INDEX_PREFIX);

export const normalizeRecallResult = (result: RecallResult): RecallResult => {
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
      ...(attributes !== undefined && hasEntries(attributes) && { attributes }),
    };
  }
  if (isAiIndexResult(result)) {
    const { id, source, date, content, attributes } = result;
    return {
      id,
      source,
      ...(date !== undefined && { date }),
      content,
      ...(attributes !== undefined && hasEntries(attributes) && { attributes }),
    };
  }
  const exhaustive: never = result;
  throw new Error(`Unsupported recall result ${JSON.stringify(exhaustive)}`);
};

export const formatRecallYaml = (results: readonly RecallResult[]): string =>
  stringify({ results: results.map(normalizeRecallResult) }, YAML_OPTIONS);

export const recallContainerChars: Readonly<
  Record<RecallFormat, { readonly wrapper: number; readonly separator: number }>
> = {
  yaml: { wrapper: YAML_RESULTS_HEADER.length, separator: 0 },
  json: { wrapper: '[]'.length, separator: ','.length },
};

export const serializedRecallItemChars = (
  normalized: RecallResult,
  format: RecallFormat
): number => {
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
