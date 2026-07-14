import type { Span } from '@opentelemetry/api';
import type { WithActiveSpanOptions } from '@kbn/tracing-utils';
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
