import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingLangfuseExportConfig } from '@kbn/inference-tracing-config';
import { BaseInferenceSpanProcessor } from '../base_inference_span_processor';
export declare class LangfuseSpanProcessor extends BaseInferenceSpanProcessor {
    private readonly config;
    private getProjectId;
    constructor(config: InferenceTracingLangfuseExportConfig);
    processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan;
}
