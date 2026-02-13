/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates UIAM keys for rules. Accepts apiKeys as base64-encoded "id:key" strings.
 * Current implementation is a mock; replace with real API call when available.
 */
export const generateUiamKeysForRules = async (
  apiKeys: string[]
): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  for (const encoded of apiKeys) {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const colonIndex = decoded.indexOf(':');
      if (colonIndex === -1) continue;
      const id = decoded.slice(0, colonIndex);
      result[id] = `essu_${id}`;
    } catch {
      // skip invalid entries
    }
  }
  return result;
};
