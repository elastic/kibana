import type { FlattenRecord, ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
export interface SimulationFeedback {
    valid: boolean;
    errors: string[];
    metrics: {
        sampled: number;
        fields: string[];
        parse_rate: number;
    };
    processors: Record<string, {
        failure_rate: number;
        top_errors: string[];
    }>;
    temporary_fields: string[];
}
/**
 * Builds a structured simulation feedback object used by both the initial dataset
 * analysis and the `simulate_pipeline` tool callback. Returns a consistent shape:
 * `{ valid, errors, metrics, processors, temporary_fields }`.
 */
export declare function buildSimulationFeedback({ simulationResult, fieldsMetadataClient, isOtel, mappedFields, getFieldSummary, }: {
    simulationResult: ProcessingSimulationResponse;
    fieldsMetadataClient: IFieldsMetadataClient;
    isOtel: boolean;
    mappedFields: Record<string, string>;
    getFieldSummary: (docs: FlattenRecord[], fieldsMetadataClient: IFieldsMetadataClient, isOtel: boolean, mappedFields: Record<string, string>) => Promise<string[]>;
}): Promise<SimulationFeedback>;
export declare function detectTemporaryFields(documents: FlattenRecord[]): string[];
