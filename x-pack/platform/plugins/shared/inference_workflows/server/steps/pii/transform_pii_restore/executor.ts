/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOKEN_RESTORE_REGEX } from '../../../anonymization/generate_token';

/**
 * Restore anonymization tokens in a text string using the provided token map.
 * Tokens that are not in the map are left unchanged.
 */
export const restoreTokens = (
  text: string,
  tokenMap: Record<string, { original: string; entityClass: string }>
): string => {
  const re = new RegExp(TOKEN_RESTORE_REGEX.source, TOKEN_RESTORE_REGEX.flags);
  return text.replace(re, (fullMatch) => tokenMap[fullMatch]?.original ?? fullMatch);
};
