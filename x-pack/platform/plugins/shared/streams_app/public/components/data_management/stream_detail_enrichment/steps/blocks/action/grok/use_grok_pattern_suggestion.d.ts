import type { useAbortController } from '@kbn/react-hooks';
import { type GrokProcessorResult } from '@kbn/grok-heuristics';
import type { Simulation } from '../../../../state_management/simulation_state_machine/types';
export declare const SUGGESTED_GROK_PROCESSOR_ID = "grok-processor";
export interface GrokPatternSuggestionParams {
    streamName: string;
    connectorId: string;
    fieldName: string;
}
export interface GrokPatternSuggestionResult {
    grokProcessor: GrokProcessorResult;
    simulationResult: Simulation;
}
export declare function useGrokPatternSuggestion(abortController: ReturnType<typeof useAbortController>): import("react-use/lib/useAsyncFn").AsyncFnReturn<{
    (params: null): Promise<undefined>;
    (params: GrokPatternSuggestionParams): Promise<GrokPatternSuggestionResult>;
}>;
