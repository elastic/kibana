import type { IngestSimulateRequest, IngestSimulateDocumentResult, SimulateIngestResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { FlattenRecord, NamedFieldDefinitionConfig, SimulationError, DocSimulationStatus, SimulationDocReport, ProcessorMetrics, ProcessingSimulationResponse } from '@kbn/streams-schema';
import { type StreamlangDSL } from '@kbn/streamlang';
import type { StreamsClient } from '../../../../lib/streams/client';
export interface ProcessingSimulationParams {
    path: {
        name: string;
    };
    body: {
        processing: StreamlangDSL;
        documents: FlattenRecord[];
        detected_fields?: NamedFieldDefinitionConfig[];
    };
}
export interface SimulateProcessingDeps {
    params: ProcessingSimulationParams;
    esClient: ElasticsearchClient;
    streamsClient: StreamsClient;
    fieldsMetadataClient: IFieldsMetadataClient;
}
export type SuccessfulPipelineSimulateDocumentResult = WithRequired<IngestSimulateDocumentResult, 'processor_results'>;
export interface SuccessfulPipelineSimulateResponse {
    docs: SuccessfulPipelineSimulateDocumentResult[];
}
export type PipelineSimulationResult = {
    status: 'success';
    simulation: SuccessfulPipelineSimulateResponse;
} | {
    status: 'failure';
    error: SimulationError;
};
export type IngestSimulationResult = {
    status: 'success';
    simulation: SimulateIngestResponse;
} | {
    status: 'failure';
    error: SimulationError;
};
export type WithRequired<TObj, TKey extends keyof TObj> = TObj & {
    [TProp in TKey]-?: TObj[TProp];
};
export declare const simulateProcessing: ({ params, esClient, streamsClient, fieldsMetadataClient, }: SimulateProcessingDeps) => Promise<ProcessingSimulationResponse>;
/**
 * When running a pipeline simulation, we want to fail fast on syntax failures, such as grok patterns.
 * If the simulation fails, we won't be able to extract the documents reports and the processor metrics.
 * In case any other error occurs, we delegate the error handling to currently in draft processor.
 */
export declare const executePipelineSimulation: (esClient: ElasticsearchClient, simulationBody: IngestSimulateRequest) => Promise<PipelineSimulationResult>;
export declare const extractProcessorMetrics: ({ processorsMap, sampleSize, }: {
    processorsMap: Record<string, ProcessorMetrics>;
    sampleSize: number;
}) => {
    [x: string]: {
        detected_fields: string[];
        errors: SimulationError[];
        failed_rate: number;
        skipped_rate: number;
        parsed_rate: number;
        dropped_rate: number;
    };
};
export declare const getDocumentStatus: (doc: SuccessfulPipelineSimulateDocumentResult, ingestDocErrors: SimulationError[], conditionProcessorTags: Set<string>) => DocSimulationStatus;
interface ComputeSimulationDocDiffParams {
    base: FlattenRecord;
    docResult: SuccessfulPipelineSimulateDocumentResult;
    isWiredStream: boolean;
    forbiddenFields: string[];
    conditionProcessorTags: Set<string>;
}
/**
 * To improve tracking down the errors and the fields detection to the individual processor,
 * this function computes the detected fields and the errors for each processor.
 *
 * Returns:
 * - `intermediate_field_changes`: All fields touched by each processor (for per-processor metrics/debugging)
 * - `detected_fields`: Only fields that exist in the final output compared to input (for overall detection)
 * - `errors`: Processing errors detected during comparison
 */
export declare const computeSimulationDocDiff: ({ base, docResult, isWiredStream, forbiddenFields, conditionProcessorTags, }: ComputeSimulationDocDiffParams) => Pick<SimulationDocReport, "errors" | "detected_fields"> & {
    intermediate_field_changes: Array<{
        processor_id: string;
        name: string;
    }>;
};
export declare const collectConditionBlockIds: (processing: StreamlangDSL) => Set<string>;
export {};
