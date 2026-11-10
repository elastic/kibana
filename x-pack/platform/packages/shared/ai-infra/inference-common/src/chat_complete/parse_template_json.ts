/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const FENCE = '```';

/**
 * Returns the body of the first markdown fence, or the original text when
 * there is no closed fence. Index scans avoid a regex that backtracks over
 * an unclosed fence.
 */
const stripMarkdownFence = (content: string): string => {
  const opener = content.indexOf(FENCE);
  if (opener === -1) {
    return content;
  }

  const afterOpener = content.slice(opener + FENCE.length);
  const lineBreak = afterOpener.search(/[\n\r]/);
  const bodyStart = lineBreak === -1 ? 0 : lineBreak + 1;
  const closer = afterOpener.indexOf(FENCE, bodyStart);
  if (closer === -1) {
    return content;
  }

  return afterOpener.slice(bodyStart, closer);
};

/**
 * Parses the JSON object from a template completion, including one wrapped in a
 * markdown fence. Throws when the text has no object.
 */
export const parseTemplateJson = (content: string): unknown => {
  const candidate = stripMarkdownFence(content).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Template response did not contain a JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
};
