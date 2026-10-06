import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingPhoenixExportConfig } from '@kbn/inference-tracing-config';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';
export declare class PhoenixSpanProcessor extends BaseInferenceSpanProcessor {
    private readonly config;
    private getProjectId;
    constructor(config: InferenceTracingPhoenixExportConfig);
    processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan;
}
