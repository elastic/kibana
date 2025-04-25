/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isAdvancedSyncRuleSnippetEmpty = (snippet: string | undefined | null) => {
  if (!snippet) {
    return true;
  }
  const trimmedSnippet = snippet.trim();

  // quick hatch
  if (trimmedSnippet === '{}' || trimmedSnippet === '[]') {
    return true;
  }

  try {
    const parsedJson = JSON.parse(trimmedSnippet);
    if (Array.isArray(parsedJson)) {
      return parsedJson.length === 0;
    } else if (typeof parsedJson === 'object') {
      return Object.keys(parsedJson).length === 0;
    }
  } catch (error) {
    // we have somewhat invalid JSON in the advanced snippet,
    // it is not empty and cause problems somewhere else
    // we should handle it here so our pages doesn't crash
    return false;
  }
  return false;
};
