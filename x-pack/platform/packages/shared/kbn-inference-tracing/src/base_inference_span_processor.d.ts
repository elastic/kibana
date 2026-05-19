import type { api } from '@elastic/opentelemetry-node/sdk';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import type { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
export declare abstract class BaseInferenceSpanProcessor implements tracing.SpanProcessor {
    private delegate;
    constructor(exporter: OTLPTraceExporter, scheduledDelayMillis: number);
    abstract processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan;
    onStart(span: tracing.Span, parentContext: api.Context): void;
    onEnd(span: tracing.ReadableSpan): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
