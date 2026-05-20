import type { NormalizedColumn, GrokPatternGroup } from '../types';
/**
 * Analyzes and processes an array of normalized columns to identify and retain
 * columns with meaningful data, collapsing the rest into a single GREEDYDATA column.
 */
export declare function getUsefulGroups(columns: NormalizedColumn[]): GrokPatternGroup[];
