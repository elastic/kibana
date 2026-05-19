/**
 * Estimates token count for given string or arbitrary data.
 * Uses a simple heuristic: ~4 characters per token.
 */
export declare const estimateTokens: (data: unknown) => number;
/**
 * Truncates a string to a given number of tokens.
 * Uses a simple heuristic: ~4 characters per token.
 */
export declare const truncateTokens: (data: string, maxTokens: number) => string;
