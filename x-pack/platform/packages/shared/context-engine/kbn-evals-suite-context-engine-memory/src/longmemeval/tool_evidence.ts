/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_TOOL_RESULT_TOKEN_BUDGET, POC_INDEX } from './constants';

/** Minimal view of an Agent Builder converse step; other fields are ignored. */
export interface ConverseStepLike {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

export interface ToolCallEvidence {
  toolId: string;
  /** Index names or patterns the call targeted. */
  targets: string[];
  /** ES|QL text for ES|QL tools; never row values. */
  query?: string;
  error: boolean;
  resultTokensEstimate: number;
  /** True when the result exceeded Agent Builder's tool-result budget and was truncated for the model. */
  overBudget: boolean;
  returnedSessionIds: string[];
}

export interface ToolEvidenceSummary {
  toolCalls: ToolCallEvidence[];
  toolCallCount: number;
  dataToolCallCount: number;
  overBudgetCount: number;
  usedReadFile: boolean;
  usedEsql: boolean;
  readsPocIndex: boolean;
  /** Indices other than the POC index that a data tool read, including the evaluation indices. */
  otherIndices: string[];
  /** Opaque session IDs returned by any tool, for the retrieval diagnostic. */
  retrievedSessionIds: string[];
}

const PLATFORM = 'platform.core.';
const DATA_READING_TOOLS = new Set([
  `${PLATFORM}search`,
  `${PLATFORM}execute_esql`,
  `${PLATFORM}generate_esql`,
  `${PLATFORM}get_document_by_id`,
  `${PLATFORM}get_index_mapping`,
  `${PLATFORM}index_explorer`,
]);
const ESQL_TOOLS = new Set([`${PLATFORM}execute_esql`, `${PLATFORM}generate_esql`]);
const READ_FILE_TOOLS = new Set(['read_file', `${PLATFORM}read_file`]);
const SESSION_ID_PATTERN = /session-\d{4}/g;
// Only the leading source command names indices. A later `from` inside a quoted search phrase
// (`MATCH(text, "flight from Paris")`) must never be read as a source.
const SOURCE_COMMAND_PATTERN = /^\s*(?:FROM|TS)\s+([^|]+?)(?:\s+METADATA\b[^|]*)?\s*(?:\||$)/is;
const ESQL_COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

/** Same chars/4 heuristic as Agent Builder's `estimateTokens`. */
const estimateTokens = (value: string): number => Math.ceil(value.length / 4);

const asStringList = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

/** Extracts the source index expressions of the leading `FROM`/`TS` command of an ES|QL query. */
export const esqlSources = (query: string): string[] => {
  const [, sources] = query.replace(ESQL_COMMENTS, ' ').match(SOURCE_COMMAND_PATTERN) ?? [];
  return (
    (sources ?? '')
      .split(',')
      .map((source) => source.trim().replace(/^["`]|["`]$/g, ''))
      // `-name` excludes an index from the pattern; it is not a source.
      .filter((source) => source.length > 0 && !source.startsWith('-'))
  );
};

// The evaluation indices (datasets, examples, scores) hold the expected answers, so a read of
// them must be flagged like any other index. Other dot-prefixed indices are Kibana internals.
const EVALUATION_INDEX = /^\.(?:ds-)?\.?evaluation/;
const isIgnoredSystemIndex = (name: string): boolean =>
  name.startsWith('.') && !EVALUATION_INDEX.test(name);

/** Whether an index name or wildcard pattern (e.g. `longmemeval*`) covers the POC index. */
export const targetsPocIndex = (target: string): boolean => {
  if (!target.includes('*')) {
    return target === POC_INDEX;
  }
  const pattern = target
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${pattern}$`).test(POC_INDEX);
};

const isErrorResult = (result: unknown): boolean =>
  typeof result === 'object' && result !== null && (result as { type?: unknown }).type === 'error';

const toToolCallEvidence = ({
  tool_id: toolId = 'unknown',
  params = {},
  results = [],
}: ConverseStepLike): ToolCallEvidence => {
  const query = typeof params.query === 'string' ? params.query : undefined;
  const isEsql = toolId === `${PLATFORM}execute_esql`;
  const targets = [
    ...asStringList(params.index),
    ...asStringList(params.indices),
    ...asStringList(params.pattern),
    ...asStringList(params.indexPattern),
    ...(isEsql && query ? esqlSources(query) : []),
  ];
  const serializedResults = JSON.stringify(results);
  const resultTokensEstimate = estimateTokens(JSON.stringify({ results }));
  return {
    toolId,
    targets: [...new Set(targets)],
    ...(isEsql && query ? { query } : {}),
    error: results.some(isErrorResult),
    resultTokensEstimate,
    overBudget: resultTokensEstimate > AGENT_BUILDER_TOOL_RESULT_TOKEN_BUDGET,
    returnedSessionIds: [...new Set(serializedResults.match(SESSION_ID_PATTERN) ?? [])],
  };
};

/** Summarizes converse steps into tool-call evidence without keeping any row values. */
export const summarizeToolEvidence = (steps: readonly ConverseStepLike[]): ToolEvidenceSummary => {
  const toolCalls = steps
    .filter((step) => step.type === 'tool_call' || typeof step.tool_id === 'string')
    .map(toToolCallEvidence);
  const dataCalls = toolCalls.filter(({ toolId }) => DATA_READING_TOOLS.has(toolId));
  const succeededDataCalls = dataCalls.filter(({ error }) => !error);

  const otherIndices = [
    ...new Set(
      dataCalls
        .flatMap(({ targets }) => targets)
        .filter((target) => !targetsPocIndex(target) && !isIgnoredSystemIndex(target))
    ),
  ];

  return {
    toolCalls,
    toolCallCount: toolCalls.length,
    dataToolCallCount: dataCalls.length,
    overBudgetCount: toolCalls.filter(({ overBudget }) => overBudget).length,
    usedReadFile: toolCalls.some(({ toolId }) => READ_FILE_TOOLS.has(toolId)),
    usedEsql: toolCalls.some(({ toolId }) => ESQL_TOOLS.has(toolId)),
    readsPocIndex: succeededDataCalls.some(({ targets }) => targets.some(targetsPocIndex)),
    otherIndices,
    retrievedSessionIds: [
      ...new Set(toolCalls.flatMap(({ returnedSessionIds }) => returnedSessionIds)),
    ],
  };
};
