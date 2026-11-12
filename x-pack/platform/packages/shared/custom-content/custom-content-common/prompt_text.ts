/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const FENCE_OPEN = /^```(?:html|HTML)?\s*\n?/;
const FENCE_CLOSE = /\n?```\s*$/;
const FENCE_MARKER = /```(?:html|HTML)?/g;
const FENCE_EDGE_WINDOW = 200;

export function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim().replace(FENCE_OPEN, '').replace(FENCE_CLOSE, '');
  return trimmed
    .replace(FENCE_MARKER, (match, offset: number) => {
      const distanceFromEdge = Math.min(offset, trimmed.length - offset - match.length);
      return distanceFromEdge <= FENCE_EDGE_WINDOW ? '' : match;
    })
    .trim();
}
// Text that goes into a model prompt. Kept apart from the zod schemas, like the other helpers here.

/** How much of a query is written into a prompt; a stored query can be far longer. */
export const CUSTOM_CONTENT_QUERY_PROMPT_LENGTH = 2000;

/**
 * A query as the model is shown it. A long one is cut, and says how long it was, so the model
 * knows it is looking at part of it. The stored query is never changed.
 */
export const truncateQueryForPrompt = (
  query: string,
  maxLength: number = CUSTOM_CONTENT_QUERY_PROMPT_LENGTH
): string =>
  query.length <= maxLength
    ? query
    : `${query.slice(0, maxLength)}… (truncated, ${query.length} characters in total)`;

/**
 * Wraps `code` in a Markdown code fence that nothing inside it can close: the fence is longer than
 * the longest run of backticks in the text, and at least three.
 */
export const fenceCode = (code: string, language: string): string => {
  const longestRun = (code.match(/`+/g) ?? []).reduce(
    (longest, run) => Math.max(longest, run.length),
    0
  );
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}${language}\n${code}\n${fence}`;
};
