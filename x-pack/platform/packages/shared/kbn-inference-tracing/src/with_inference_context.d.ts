/**
 * Creates an active "inference"-scoped context. Every span created in this
 * context will be exported via the inference exporters. This allows us to export
 * a subset of spans to external systems like Phoenix.
 */
export declare const withInferenceContext: <T>(fn: () => T) => T;
