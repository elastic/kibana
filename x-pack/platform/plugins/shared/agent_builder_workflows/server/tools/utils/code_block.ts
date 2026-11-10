/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wraps `text` in a Markdown code block, cut at `maxChars`. The fence is longer
 * than any backtick run in `text`, so no line of `text` can close the block.
 */
export const formatCodeBlock = (language: string, text: string, maxChars: number): string => {
  const shown = text.length > maxChars ? `${text.slice(0, maxChars)}\n…` : text;
  const longestRun = Math.max(0, ...(shown.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return [`${fence}${language}`, shown, fence].join('\n');
};
