export declare const QUOTE_PAIRS: {
    '"': string;
    "'": string;
    '`': string;
};
/**
 * Masks quoted substrings in a given line of text by replacing them with a custom value.
 * Handles single, double, and backtick quotes, respecting escape sequences within the quotes.
 *
 * @param line - The input string to process.
 * @param replaceWith - A function that takes the matched quoted substring and returns the replacement string.
 * @returns The processed string with quoted substrings replaced.
 */
export declare function maskQuotes(line: string, replaceWith: (match: string) => string): string;
