/**
 * Determines the most suitable delimiter from a predefined set by analyzing
 * the frequency of each delimiter across a list of messages. The delimiter
 * with the highest minimum occurrence across all messages is selected.
 *
 * @param messages - An array of strings to analyze for delimiter patterns.
 * @returns The most suitable delimiter
 */
export declare function findDelimiter(messages: string[]): string;
