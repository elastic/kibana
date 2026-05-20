import type { MaskedMessage } from '../types';
/**
 * Split messages into columns (using the specified delimiter), tokenize them (using the specified
 * split characters), and identify matching patterns for each token.
 */
export declare function tokenizeLines(lines: MaskedMessage[], delimiter: string, splitChars?: string[][]): {
    value: string;
    tokens: {
        value: string;
        patterns: number[];
        excludedPatterns: number[];
    }[];
}[][];
export declare function tokenize(col: string, literals: string[], splitChars: string[]): string[];
interface FindMatchingPatternsResult {
    patterns: number[];
    excludedPatterns: number[];
}
export declare function findMatchingPatterns(value: string, nextValue?: string): FindMatchingPatternsResult;
export {};
