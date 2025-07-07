/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Function to check if a string is a real URL
const isRealUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Prevents auto-linkification in email clients by inserting zero-width spaces
 * after dots. Real URLs (http/https) are preserved intact.
 */
export const escapeLinkLike = (text: string): string => {
  if (!text) return text;

  // For everything else (full messages or non-URL values),
  // find and escape all dot-containing substrings
  return text.replace(/\S+\.\S+/g, (match) => {
    // Keep real URLs intact
    if (isRealUrl(match)) return match;

    // Add zero-width space after each dot
    return match.replace(/\./g, '.\u200B');
  });
};
