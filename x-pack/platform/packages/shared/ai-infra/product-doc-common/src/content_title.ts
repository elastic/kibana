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

const firstMarkdownHeading = (content: string): string | undefined => {
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/);
    return match?.[1]?.trim();
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
