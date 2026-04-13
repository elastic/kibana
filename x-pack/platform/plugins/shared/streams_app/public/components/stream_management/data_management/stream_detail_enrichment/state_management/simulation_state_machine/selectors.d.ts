import type { FlattenRecord } from '@kbn/streams-schema';
import type { SimulationContext } from './types';
/**
 * Selects the simulated documents with applied filtering by
 * the selected condition and preview table filter (Parsed, Skipped, etc.).
 */
export declare const selectPreviewRecords: ((state: Pick<SimulationContext, "samples"> & Pick<SimulationContext, "previewDocsFilter"> & Pick<SimulationContext, "simulation"> & Pick<SimulationContext, "selectedConditionId">) => FlattenRecord[]) & import("reselect").OutputSelectorFields<(args_0: import("./types").SampleDocumentWithUIAttributes[], args_1: "outcome_filter_all" | "outcome_filter_parsed" | "outcome_filter_partially_parsed" | "outcome_filter_skipped" | "outcome_filter_failed" | "outcome_filter_dropped", args_2: import("@kbn/streams-schema").SimulationDocReport[] | undefined, args_3: string | undefined) => FlattenRecord[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Selects the original samples with applied filtering by
 * the selected condition and preview table filter (Parsed, Skipped, etc.).
 */
export declare const selectOriginalPreviewRecords: ((state: SimulationContext) => import("./types").SampleDocumentWithUIAttributes[]) & import("reselect").OutputSelectorFields<(args_0: import("./types").SampleDocumentWithUIAttributes[], args_1: "outcome_filter_all" | "outcome_filter_parsed" | "outcome_filter_partially_parsed" | "outcome_filter_skipped" | "outcome_filter_failed" | "outcome_filter_dropped", args_2: import("@kbn/streams-schema").SimulationDocReport[] | undefined, args_3: string | undefined) => import("./types").SampleDocumentWithUIAttributes[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectHasSimulatedRecords: ((state: SimulationContext) => boolean) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/streams-schema").SimulationDocReport[] | undefined) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFieldsInSamples: ((state: SimulationContext) => string[]) & import("reselect").OutputSelectorFields<(args_0: import("./types").SampleDocumentWithUIAttributes[]) => string[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
