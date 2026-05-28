import { type WithActiveSpanOptions } from '@kbn/tracing-utils';
export declare function withTaskSpan(name: string, opts: WithActiveSpanOptions, cb: () => any): any;
/**
 * Use this wrapper when you want to include trace-based metrics with evaluations and use qualitative evaluators within the
 * context of a Phoenix task. This ensures the evaluator spans get new root context and have a different trace id than the evaluated example span.
 */
export declare function withEvaluatorSpan(name: string, opts: WithActiveSpanOptions, cb: () => any): any;
export declare function getCurrentTraceId(): string | null;
