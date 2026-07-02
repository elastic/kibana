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
export declare const replaceTokensWithOriginals: (text: string, tokenToOriginal: Record<string, string>) => string;
