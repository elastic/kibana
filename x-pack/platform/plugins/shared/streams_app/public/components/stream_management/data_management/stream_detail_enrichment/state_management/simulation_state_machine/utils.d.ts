import type { StreamlangProcessorDefinitionWithUIAttributes, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { FieldDefinition, FlattenRecord } from '@kbn/streams-schema';
import type { MappedSchemaField, SchemaField, UnmappedSchemaField } from '../../../schema_editor/types';
import type { PreviewDocsFilterOption } from './simulation_documents_search';
import type { DetectedField, SampleDocumentWithUIAttributes, Simulation, SimulationContext } from './types';
export declare function getSourceField(processor: StreamlangProcessorDefinitionWithUIAttributes): string | undefined;
export declare function getUniqueDetectedFields(detectedFields?: DetectedField[]): string[];
/**
 * Recursively collects all descendant processor IDs
 * for a given condition step ID.
 */
export declare function collectDescendantProcessorIdsForCondition(steps: StreamlangStepWithUIAttributes[], conditionId: string): string[];
/**
 * Collects the documents affected by the processors
 * directly included in the currently selected condition.
 */
export declare function collectActiveDocumentsForSelectedCondition(documents: Simulation['documents'] | undefined, selectedConditionId: string | undefined): Simulation['documents'];
/**
 * Filters documents based on the processors
 * that affected them during simulation.
 */
export declare function collectDocumentsAffectedByProcessors(documents: Simulation['documents'] | undefined, processorIds: string[]): Simulation['documents'];
export declare function getAllFieldsInOrder(previewRecords?: FlattenRecord[], detectedFields?: DetectedField[]): string[];
export declare function getTableColumns({ currentProcessorSourceField, detectedFields, previewDocsFilter, }: {
    currentProcessorSourceField?: string;
    detectedFields?: DetectedField[];
    previewDocsFilter: PreviewDocsFilterOption;
}): string[];
type SimulationDocReport = Simulation['documents'][number];
export declare function getFilterSimulationDocumentsFn(filter: PreviewDocsFilterOption): (doc: SimulationDocReport) => boolean;
export declare function getSchemaFieldsFromSimulation(context: SimulationContext): {
    detectedSchemaFields: SchemaField[];
    detectedSchemaFieldsCache: Map<string, SchemaField>;
};
export declare function mapField(context: SimulationContext, updatedField: MappedSchemaField): {
    detectedSchemaFields: SchemaField[];
    detectedSchemaFieldsCache: Map<string, SchemaField>;
};
export declare function unmapField(context: SimulationContext, fieldName: string): {
    detectedSchemaFields: SchemaField[];
    detectedSchemaFieldsCache: Map<string, SchemaField>;
};
export declare function getMappedSchemaFields(fields: SchemaField[]): MappedSchemaField[];
export declare function getUnmappedSchemaFields(fields: SchemaField[]): UnmappedSchemaField[];
export declare function convertToFieldDefinition(fields: MappedSchemaField[]): FieldDefinition;
/**
 * Safely retrieves the original sample document for a given document index.
 *
 * This function handles the edge case where the samples array might have been
 * re-filtered (e.g., when switching preview tabs from "Processed" to "Dropped")
 * while a document is still selected in the flyout. In such cases, the
 * currentDocIndex might be out of bounds for the new samples array.
 *
 * @param originalSamples - Array of sample documents with UI attributes, or undefined
 * @param currentDocIndex - The index of the currently selected document, or undefined
 * @returns The document at the given index, or undefined if samples is empty,
 *          index is undefined, or index is out of bounds
 */
export declare function getOriginalSampleDocument(originalSamples: SampleDocumentWithUIAttributes[] | undefined, currentDocIndex: number | undefined): SampleDocumentWithUIAttributes['document'] | undefined;
export {};
