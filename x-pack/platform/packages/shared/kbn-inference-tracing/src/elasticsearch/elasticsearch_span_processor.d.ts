import type { InferenceTracingElasticsearchExportConfig } from '@kbn/inference-tracing-config';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';
/**
 * ElasticsearchSpanProcessor is a span processor that exports inference traces
 * directly to an Elasticsearch cluster for storage and analysis.
 *
 * This tracer follows the same pattern as LangfuseSpanProcessor and PhoenixSpanProcessor,
 * extending BaseInferenceSpanProcessor to handle inference-specific span filtering
 * and processing.
 */
export declare class ElasticsearchSpanProcessor extends BaseInferenceSpanProcessor {
    private readonly config;
    private readonly indexName;
    constructor(config: InferenceTracingElasticsearchExportConfig);
    processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan;
}
