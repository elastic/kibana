import type { Span } from '@opentelemetry/api';
import type { WithActiveSpanOptions } from '@kbn/tracing-utils';
/**
 * Per the GenAI semantic conventions (and MCP conventions), when a tool
 * call succeeds at the execution level but the tool itself returns an
 * error result, `error.type` SHOULD be set to `'tool_error'`.
 */
export declare const TOOL_ERROR_TYPE = "tool_error";
export interface MarkToolSpanAsErrorOptions {
    result?: unknown;
    error?: Error;
}
/**
 * Marks a tool span as errored per GenAI/MCP semantic conventions.
 * Also ends the span so that downstream handlers (e.g. `handlePromise`
 * in `withActiveSpan`) cannot override the status back to `OK`.
 */
export declare const markToolSpanAsError: (span: Span, { result, error }?: MarkToolSpanAsErrorOptions) => void;
/**
 * Wrapper around {@link withActiveInferenceSpan} that sets the right attributes for a execute_tool operation span.
 * @param options
 * @param cb
 */
export declare function withExecuteToolSpan<T>(toolName: string, options: WithActiveSpanOptions & {
    tool: {
        description?: string;
        toolCallId?: string;
        input?: unknown;
    };
}, cb: (span?: Span) => T): T;
