/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Replaces anonymization tokens in a text string with their original values
 * using the provided token-to-original mapping.
 *
 * This is a pure function usable by both client and server code.
 * The UI should use this for local deanonymization when it already has
 * an authorized mapping, rather than calling the server for substitution.
 *
 * Tokens are replaced longest-first to avoid partial replacement issues
 * (e.g., `HOST_NAME_abc` should not be partially matched by a shorter token).
 *
 * @param text - The text containing anonymization tokens
 * @param tokenToOriginal - Map of token → original value
 * @returns The text with tokens replaced by original values
 */
export const replaceTokensWithOriginals = (
  text: string,
  tokenToOriginal: Record<string, string>
): string => {
  const tokens = Object.keys(tokenToOriginal);

  if (tokens.length === 0) {
    return text;
  }

  // Sort longest-first to prevent partial replacements
  const sortedTokens = tokens.sort((a, b) => b.length - a.length);

  let result = text;
  for (const token of sortedTokens) {
    const original = tokenToOriginal[token];
    // Replace all occurrences of the token
    result = result.split(token).join(original);
  }

  return result;
};
