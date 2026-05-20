import { Streams } from '@kbn/streams-schema';
export declare const SuggestIngestPipelinePrompt: import("@kbn/inference-common").Prompt<{
    stream: Streams.all.Definition;
    pipeline_schema: string;
    fields_schema: string;
    content_field: string;
    severity_field: string;
    initial_dataset_analysis: string;
    upstream_extraction_context: string;
    field_examples: string;
}, [{
    system: {
        mustache: {
            template: any;
        };
    };
    template: {
        mustache: {
            template: any;
        };
    };
    tools: {
        readonly simulate_pipeline: {
            readonly description: "Test your pipeline against sample data. Use this iteratively: simulate → read errors → fix → simulate again. Returns validation errors and simulation metrics. Keep calling until errors are resolved.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly pipeline: {
                        readonly type: "object";
                        readonly description: "The pipeline definition object containing processing steps. Always include `steps` (array of processors). For a first candidate with no processors yet, use { \"steps\": [] }; never send {}.";
                        readonly properties: {
                            readonly steps: {
                                readonly type: "array";
                                readonly description: "Ordered list of processors that transform documents. Shapes must match the Pipeline schema in the system prompt.";
                            };
                        };
                        readonly required: ["steps"];
                    };
                };
                readonly required: ["pipeline"];
            };
        };
        readonly commit_pipeline: {
            readonly description: "Finalize the pipeline after simulation passes (valid: true) and all temporary fields are cleaned up. Only commit { \"steps\": [] } after verifying the Inspection checklist in the system prompt—all five checks must pass.";
            readonly schema: {
                readonly type: "object";
                readonly properties: {
                    readonly pipeline: {
                        readonly type: "object";
                        readonly description: "The pipeline definition object containing processing steps. Use { \"steps\": [] } if no processing is needed.";
                        readonly properties: {
                            readonly steps: {
                                readonly type: "array";
                                readonly description: "Ordered list of processors that transform documents. Shapes must match the Pipeline schema in the system prompt.";
                            };
                        };
                        readonly required: ["steps"];
                    };
                };
                readonly required: ["pipeline"];
            };
        };
    };
}]>;
