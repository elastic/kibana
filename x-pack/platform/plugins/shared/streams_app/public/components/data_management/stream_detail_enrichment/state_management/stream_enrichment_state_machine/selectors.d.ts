import type { StreamEnrichmentActorSnapshot } from './stream_enrichment_state_machine';
import type { StreamEnrichmentContextType } from './types';
import type { DataSourceContext } from '../data_source_state_machine';
/**
 * Selects whether the state machine is in interactive mode.
 */
export declare const selectIsInteractiveMode: (state: StreamEnrichmentActorSnapshot) => boolean;
/**
 * Selects validation errors for all processors.
 * Returns a Map of step customIdentifier to validation errors.
 * Validation errors are computed in the state machine and stored in context.
 */
export declare const selectValidationErrors: (context: StreamEnrichmentContextType) => Map<string, import("@kbn/streamlang").StreamlangValidationError[]>;
/**
 * Returns true if there are any schema errors or validation errors.
 * Schema errors come from Zod parsing failures.
 * Validation errors come from processor validation (namespace, reserved fields, type mismatches).
 */
export declare const selectHasAnyErrors: (context: StreamEnrichmentContextType) => boolean;
/**
 * Checks if there are any errors in a parent snapshot context.
 * Used by child machines (YAML mode, interactive mode) to check parent state.
 */
export declare const hasErrorsInParentSnapshot: (parentSnapshot: {
    context: {
        schemaErrors: string[];
        validationErrors: Map<string, unknown>;
    };
}) => boolean;
/**
 * Selects schema errors from Zod parsing.
 */
export declare const selectSchemaErrors: (context: StreamEnrichmentContextType) => string[];
export declare const selectWhetherThereAreOutdatedDocumentsInSimulation: ((state: StreamEnrichmentContextType, dataSourceContext: DataSourceContext | undefined) => boolean) & import("reselect").OutputSelectorFields<(args_0: string, args_1: "latest-samples" | "failure-store" | "kql-samples" | "custom-samples" | undefined, args_2: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[] | undefined) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectStreamType: ((state: StreamEnrichmentContextType) => import("@kbn/streams-schema").StreamType) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/streams-schema/src/models/ingest").IngestStream.all.GetResponse) => import("@kbn/streams-schema").StreamType, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
