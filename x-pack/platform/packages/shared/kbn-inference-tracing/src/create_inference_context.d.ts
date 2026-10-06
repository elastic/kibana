export declare function createInferenceContext(): {
    context: import("@opentelemetry/api").Context;
    baggage: import("@opentelemetry/api").Baggage;
    isRoot: boolean;
};
