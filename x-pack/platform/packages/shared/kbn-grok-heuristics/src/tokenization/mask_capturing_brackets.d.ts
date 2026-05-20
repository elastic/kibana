export declare const BRACKET_PAIRS: {
    '[': string;
    '{': string;
};
/**
 * Masks content within capturing brackets (e.g., `{}` or `[]`) in a given string.
 * Allows nested brackets and mixed types (e.g., `{[ ]}`).
 * Skips masking for `{` preceded by `%` (e.g., `%{`).
 *
 * @param line - The input string to process.
 * @param replaceWith - A function to generate the replacement for matched content.
 * @returns The processed string with masked content.
 */
export declare function maskCapturingBrackets(line: string, replaceWith: (match: string) => string): string;
