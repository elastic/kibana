/**
 * Based on the list of keywords the model asked to get documentation for,
 * Try to provide suggestion on other commands or keywords that may be useful.
 *
 * E.g. when requesting documentation for `STATS` and `DATE_TRUNC`, suggests `BUCKET`
 *
 */
export declare const getSuggestions: (keywords: string[]) => string[];
