/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wraps content in a markdown code block, shown as written. The fence is longer than any backtick
 * run in the content, so the content can't close it.
 */
export const toCodeFence = (content: string, language = ''): string => {
  const longestBacktickRun = Math.max(
    0,
    ...(content.match(/`+/g) ?? []).map(({ length }) => length)
  );
  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1));

  return `${fence}${language}\n${content}\n${fence}`;
};

/** A markdown bullet list of the items that are set. */
export const toBulletList = (items: ReadonlyArray<string | false | undefined>): string =>
  items
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join('\n');
