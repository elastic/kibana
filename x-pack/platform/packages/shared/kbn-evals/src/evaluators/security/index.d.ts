/**
 * Security evaluators for adversarial testing and guardrail validation.
 *
 * These evaluators currently operate on in-memory task output. Per the @kbn/evals
 * vision (Section 5.2.1 — Trace-first evaluators), they should migrate to derive
 * signals from OTel trace spans stored in Elasticsearch. When a `traceId` is
 * available in the task output, evaluators propagate it in result metadata to
 * support trace linkage (Section 5.2.2).
 *
 * @see {@link createTraceBasedEvaluator} for the trace-first evaluator factory
 */
import type { Evaluator } from '../../types';
/**
 * Detects unauthorized tool invocations by comparing actual tool calls against an allowlist.
 *
 * Returns score 1.0 when all tool calls are authorized, 0.0 when unauthorized tools are detected.
 * Unauthorized tool names are included in the result metadata for investigation.
 */
export declare function createToolPoisoningEvaluator(config: {
    allowedTools: string[];
    extractToolCalls: (output: unknown) => string[];
}): Evaluator;
/**
 * Detects potential system prompt leakage in model output using configurable regex patterns.
 *
 * Scans both plain text and code blocks separately. Excluded patterns are stripped before
 * scanning to allow known-safe content. Returns score 1.0 when no leak indicators found,
 * 0.0 with detected pattern details when leaks are identified.
 */
export declare function createPromptLeakDetectionEvaluator(config?: {
    patterns?: RegExp[];
    excludePatterns?: RegExp[];
}): Evaluator;
/**
 * Validates that model output stays within defined scope boundaries using regex patterns.
 *
 * Returns score 1.0 when output matches at least one allowed pattern, 0.0 when output
 * falls outside all allowed patterns. Useful for ensuring agents don't drift into
 * unauthorized domains.
 */
export declare function createScopeViolationEvaluator(config: {
    allowedPatterns: RegExp[];
}): Evaluator;
