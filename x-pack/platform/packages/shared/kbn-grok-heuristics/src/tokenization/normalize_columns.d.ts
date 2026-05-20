import type { SingleLineColumn, NormalizedColumn } from '../types';
/**
 * Normalizes columns for each line into one single set of columns that represents a common structure.
 *
 * @param columnsPerLine - Array of message templates, each containing columns with tokens.
 * @returns Normalized columns with whitespace stats and token patterns.
 */
export declare function normalizeColumns(columnsPerLine: SingleLineColumn[][]): NormalizedColumn[];
