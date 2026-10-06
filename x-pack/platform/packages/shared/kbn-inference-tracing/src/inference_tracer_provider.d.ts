import { tracing } from '@elastic/opentelemetry-node/sdk';
import type { resources } from '@elastic/opentelemetry-node/sdk';
import type { Tracer } from '@opentelemetry/api';
export declare const initInferenceTracerProvider: ({ processors, resource, }: {
    processors: tracing.SpanProcessor[];
    resource: resources.Resource;
}) => void;
/** Returns the dedicated inference tracer, falling back to the global one before init. */
export declare const getInferenceTracer: () => Tracer;
export declare const shutdownInferenceTracerProvider: () => Promise<void>;
