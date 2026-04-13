import type { useAbortController } from '@kbn/react-hooks';
export declare const SUGGESTED_DISSECT_PROCESSOR_ID = "dissect-processor";
export interface DissectPatternSuggestionParams {
    streamName: string;
    connectorId: string;
    fieldName: string;
}
export declare function useDissectPatternSuggestion(abortController: ReturnType<typeof useAbortController>): import("react-use/lib/useAsyncFn").AsyncFnReturn<(params: DissectPatternSuggestionParams | null) => Promise<{
    dissectProcessor: import("@kbn/dissect-heuristics").DissectProcessorResult;
    simulationResult: import("@kbn/streams-schema").ProcessingSimulationResponse;
} | undefined>>;
