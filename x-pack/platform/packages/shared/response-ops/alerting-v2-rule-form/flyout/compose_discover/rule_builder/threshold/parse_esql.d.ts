import { type ThresholdFormValues } from './form_types';
/**
 * Attempts to parse an ES|QL query string back into ThresholdFormValues.
 * Returns null if the query doesn't match the expected builder structure,
 * signaling the caller to fall back to ES|QL mode.
 *
 * Expected command sequence:
 *   FROM <index> [| WHERE <filter>] | STATS ... [BY ...] [| EVAL ...]* [| WHERE <conditions>]
 */
export declare const parseThresholdEsql: (query: string) => ThresholdFormValues | null;
