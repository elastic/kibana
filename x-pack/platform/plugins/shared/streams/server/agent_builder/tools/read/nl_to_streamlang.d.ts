import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { StreamlangStep, StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { StreamsClient } from '../../../lib/streams/client';
export type SamplesConfig = {
    source: 'stream';
    size?: number;
} | {
    source: 'inline';
    documents: Array<Record<string, unknown>>;
    status: 'processed' | 'unprocessed';
};
export interface NlToStreamlangParams {
    streamName: string;
    instruction: string;
    samples?: SamplesConfig;
}
export interface FieldChange {
    field: string;
    change: 'created' | 'removed' | 'modified';
    type?: string;
    sample_values?: Array<string | number | boolean>;
}
export type SimulationMode = 'complete' | 'partial';
export interface NlToStreamlangResult {
    steps: StreamlangStep[];
    summary: string;
    field_changes: FieldChange[];
    simulation: {
        success_rate: number | null;
        errors?: string[];
        sample_count: number;
        mode: SimulationMode;
    };
    warnings?: string[];
    hints?: string[];
    samples_info: {
        source: 'stream' | 'inline';
        count: number;
    };
}
export interface NlToStreamlangDeps {
    streamsClient: StreamsClient;
    esClient: ElasticsearchClient;
    inferenceClient: BoundInferenceClient;
    simulatePipeline: (streamName: string, processing: StreamlangDSL, documents: Array<Record<string, unknown>>) => Promise<ProcessingSimulationResponse>;
}
export declare const nlToStreamlang: (params: NlToStreamlangParams, deps: NlToStreamlangDeps) => Promise<NlToStreamlangResult>;
