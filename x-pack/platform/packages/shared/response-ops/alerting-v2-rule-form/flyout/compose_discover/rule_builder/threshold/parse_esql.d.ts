import { type ThresholdFormValues, type RecoveryCondition, type ConditionOperator } from './form_types';
export declare const parseRecoveryBlock: (recoveryBlock: string) => {
    conditions: RecoveryCondition[];
    conditionOperator: ConditionOperator;
} | null;
export declare const extractRecoveryBlock: (fullRecoveryQuery: string) => string | undefined;
/**
 * Attempts to parse an ES|QL query string back into ThresholdFormValues.
 * Returns null if the query doesn't match the expected builder structure,
 * signaling the caller to fall back to ES|QL mode.
 *
 * Expected command sequence:
 *   FROM <index> [| WHERE <filter>] | STATS ... [BY ...] [| EVAL ...]* [| WHERE <conditions>]
 */
export declare const parseThresholdEsql: (query: string, recoveryQuery?: string) => ThresholdFormValues | null;
/**
 * Best-effort parser for Discover ES|QL queries that may not match the full
 * threshold builder structure. Falls back through increasingly loose extraction:
 *
 * 1. `parseThresholdEsql` — full builder state for complete threshold queries
 * 2. Loose FROM + WHERE extraction — index pattern and optional pre-STATS filter
 * 3. `null` — nothing extractable (invalid ES|QL, no FROM, etc.)
 */
export declare const parseDiscoverQueryForBuilder: (query: string) => ThresholdFormValues | null;
