import type { SingleLineColumn } from '../types';
/**
 * Analyzes columns of tokens across multiple lines to determine which split characters
 * are consistently used in each column. It returns a list of consistent split characters
 * for each column, including additional quote split characters.
 *
 * @param columnsPerLine - A 2D array where each row represents a line, and each column contains tokens.
 * @returns A 2D array where each entry corresponds to a column and contains the consistent split
 */
export declare function findConsistentSplitChars(columnsPerLine: SingleLineColumn[][]): string[][];
