import type { StreamlangDSL, StreamlangDSLWithUpdatedAt, StreamlangStep } from '../../types/streamlang';
/**
 * Recursively removes customIdentifier from all steps in the DSL.
 * This creates a new DSL object without modifying the original.
 * Useful for comparing DSLs based on content only, ignoring internal tracking IDs.
 */
export declare function stripCustomIdentifiers(dsl: StreamlangDSL): StreamlangDSL;
/**
 * Drops ingest-only fields and returns a plain {@link StreamlangDSL} (`steps` only).
 */
export declare function streamlangDSLFromIngestProcessing(processing: StreamlangDSLWithUpdatedAt): StreamlangDSL;
/**
 * Adds deterministic `customIdentifier` values on every step. Input must be a pure
 * {@link StreamlangDSL}; use {@link addDeterministicCustomIdentifiersFromIngestProcessing} for
 * `ingest.processing` values that include `updated_at`.
 */
export declare const addDeterministicCustomIdentifiers: (dsl: StreamlangDSL) => StreamlangDSL;
/**
 * Same as {@link addDeterministicCustomIdentifiers} after normalizing ingest `processing`.
 */
export declare function addDeterministicCustomIdentifiersFromIngestProcessing(processing: StreamlangDSLWithUpdatedAt): StreamlangDSL;
/**
 * Adds a generated customIdentifier to each step
 * This is a combination of a hash of the step's content and the step's path within the DSL.
 */
export declare function addStepIdentifiers(steps: StreamlangStep[], path?: string): StreamlangStep[];
export declare const addIdentifierToStep: (step: StreamlangStep, path: string, index: number) => {
    step: StreamlangStep;
    stepPath: string;
};
/**
 * Result of checking if changes are purely additive
 */
export interface AdditiveChangesResult {
    /** True if changes are purely additive (only new steps at the end, no modifications or deletions) */
    isPurelyAdditive: boolean;
    /** New steps added at the end (only populated if isPurelyAdditive is true) */
    newSteps: StreamlangStep[];
    /** Array of customIdentifiers from all new steps, including nested steps (only populated if isPurelyAdditive is true) */
    newStepIds?: string[];
}
export declare const checkAdditiveChanges: (previousDSL: StreamlangDSL, nextDSL: StreamlangDSL) => AdditiveChangesResult;
/**
 * Counts the total number of processors (action blocks) in a DSL.
 * This function recursively traverses the entire DSL, including nested steps in where blocks,
 * and counts only action blocks (not where blocks themselves).
 *
 * @param dsl - The Streamlang DSL to count processors in
 * @returns The total count of action blocks
 */
export declare const getProcessorsCount: (dsl: StreamlangDSL) => number;
