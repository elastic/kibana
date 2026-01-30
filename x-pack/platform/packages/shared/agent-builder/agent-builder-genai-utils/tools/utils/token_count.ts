/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Estimates token count for given string or arbitrary data.
 * Uses a simple heuristic: ~4 characters per token.
 */
export const estimateTokens = (data: unknown): number => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return Math.ceil(str.length / 4);
};

/**
 * Truncates a string to a given number of tokens.
 * Uses a simple heuristic: ~4 characters per token.
 */
export const truncateTokens = (data: string, maxTokens: number): string => {
  return data.slice(0, maxTokens * 4);
};
