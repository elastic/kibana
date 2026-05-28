/** Patterns like "Precision@K" that match any K-specific evaluator (e.g., "Precision@10") */
export declare const RAG_METRIC_PATTERNS: string[];
/** Returns true if name is K-specific like "Precision@10" (not allowed in SELECTED_EVALUATORS) */
export declare function isKSpecificRagEvaluator(name: string): boolean;
/** Matches evaluator name against pattern. Supports exact match and @K patterns. */
export declare function matchesEvaluatorPattern(evaluatorName: string, pattern: string): boolean;
/** Expands patterns to actual evaluator names (e.g., "Precision@K" -> ["Precision@5", "Precision@10"]) */
export declare function expandPatternsToEvaluators(patterns: string[], evaluatorNames: string[]): string[];
