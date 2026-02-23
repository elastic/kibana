import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingElasticsearchExportConfig } from '@kbn/inference-tracing-config';
/**
 * Export result codes matching OpenTelemetry conventions
 */
declare enum ExportResultCode {
    SUCCESS = 0,
    FAILED = 1
}
interface ExportResult {
    code: ExportResultCode;
    error?: Error;
}
/**
 * Custom SpanExporter that sends traces directly to Elasticsearch.
 * Implements the tracing.SpanExporter interface from @elastic/opentelemetry-node/sdk.
 */
export declare class ElasticsearchExporter implements tracing.SpanExporter {
    private readonly config;
    private pendingExports;
    constructor(config: InferenceTracingElasticsearchExportConfig);
    export(spans: tracing.ReadableSpan[], resultCallback: (result: ExportResult) => void): void;
    private doExport;
    private spanToDocument;
    private getSpanKindString;
    shutdown(): Promise<void>;
    forceFlush(): Promise<void>;
}
export {};
