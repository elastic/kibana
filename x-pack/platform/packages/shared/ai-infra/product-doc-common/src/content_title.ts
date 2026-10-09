/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SITE_SUFFIX_SEPARATOR = ' | ';

/** Drop a site-name suffix such as " | Elastic Docs" without splitting names like ES|QL. */
export const stripSiteSuffix = (title: string): string => {
  return title.split(SITE_SUFFIX_SEPARATOR)[0].trim();
};

const isWhitespace = (char: string): boolean => char.trim() === '';

/**
 * Text of a markdown heading, or undefined when `line` is not one.
 * Any leading hash run counts, and a closing hash sequence is dropped.
 * Parsed without a regex so long lines stay linear.
 */
const atxHeadingText = (line: string): string | undefined => {
  let marker = 0;
  while (marker < line.length && line[marker] === '#') {
    marker++;
  }
  if (marker === 0 || marker === line.length || !isWhitespace(line[marker])) {
    return undefined;
  }

  let start = marker;
  while (start < line.length && isWhitespace(line[start])) {
    start++;
  }
  if (start === line.length) {
    return undefined;
  }

  // Leave at least one character so a heading that is only a hash is preserved.
  let end = line.length;
  while (end > start + 1 && line[end - 1] === '#') {
    end--;
  }
  while (end > start + 1 && isWhitespace(line[end - 1])) {
    end--;
  }

  return line.slice(start, end).trim() || undefined;
};

const firstMarkdownHeading = (content: string): string | undefined => {
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const heading = atxHeadingText(trimmed);
    if (heading) {
      return heading;
    }
  }
  return undefined;
};

/**
 * Keep a product-name pipe such as ES|QL, and restore a title that was cut at that pipe
 * when the document heading still has the remainder.
 */
export const resolveContentTitle = (title: string, content: string): string => {
  const fromField = stripSiteSuffix(title);
  const heading = firstMarkdownHeading(content);
  if (!heading) {
    return fromField;
  }

  const fromHeading = stripSiteSuffix(heading);
  if (fromHeading.startsWith(fromField) && fromHeading.charAt(fromField.length) === '|') {
    return fromHeading;
  }

  return fromField;
};
