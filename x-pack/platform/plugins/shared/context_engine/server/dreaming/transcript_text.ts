/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Characters kept of one text part, such as a user message or an answer. */
export const MAX_TEXT_PART_CHARS = 16_000;
/** Characters kept of the arguments of one tool call. */
export const MAX_TOOL_ARGUMENTS_CHARS = 2000;
/** Characters kept of one tool result, such as a page an agent opened or the rows a query returned. */
export const MAX_TOOL_RESULT_CHARS = 16_000;
/** Characters kept of a whole round, about 400k tokens; a longer round keeps its start and end. */
const MAX_ROUND_CHARS = 1_600_000;

const ELLIPSIS = ' […]';

export const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}${ELLIPSIS}` : text;

export const capRound = (text: string): string => {
  if (text.length <= MAX_ROUND_CHARS) {
    return text;
  }
  const head = Math.floor(MAX_ROUND_CHARS / 3);
  const tail = MAX_ROUND_CHARS - head;
  return `${text.slice(0, head)}\n[…]\n${text.slice(text.length - tail)}`;
};
