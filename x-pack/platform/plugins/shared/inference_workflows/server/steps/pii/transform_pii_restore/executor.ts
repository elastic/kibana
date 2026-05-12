/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TokenEntry } from '../../../anonymization/context_handle';
import { TOKEN_RESTORE_REGEX } from '../../../anonymization/generate_token';

/**
 * Restore anonymization tokens in a text string using the provided token map.
 * Tokens that are not in the map are left unchanged.
 */
export const restoreTokens = (text: string, tokenMap: Map<string, TokenEntry>): string => {
  const re = new RegExp(TOKEN_RESTORE_REGEX.source, TOKEN_RESTORE_REGEX.flags);
  return text.replace(re, (fullMatch) => {
    const entry = tokenMap.get(fullMatch);
    return entry ? entry.original : fullMatch;
  });
};
