import { Streams } from '@kbn/streams-schema';
export interface ProcessingChainEntry {
    source: string;
    steps: unknown[];
}
export interface FieldMappingEntry {
    source: string;
    name: string;
    type: string;
    parameters?: Record<string, unknown>;
}
export declare const buildProcessingChain: (definition: Streams.ingest.all.Definition, ancestors: Streams.WiredStream.Definition[]) => ProcessingChainEntry[];
export declare const buildFieldMappings: (definition: Streams.ingest.all.Definition, ancestors: Streams.WiredStream.Definition[]) => FieldMappingEntry[];
