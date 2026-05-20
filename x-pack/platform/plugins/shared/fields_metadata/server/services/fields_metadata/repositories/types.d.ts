import type { ElasticsearchClient } from '@kbn/core/server';
import type { FieldMetadataPlain } from '../../../../common';
export interface IntegrationFieldsSearchParams {
    integration: string;
    dataset?: string;
}
export type IntegrationName = string;
export type DatasetName = string;
export type ExtractedIntegrationFields = Record<IntegrationName, ExtractedDatasetFields>;
export type ExtractedDatasetFields = Record<DatasetName, FieldMetadataPlain>;
export type IntegrationFieldsExtractor = (params: IntegrationFieldsSearchParams) => Promise<ExtractedIntegrationFields>;
export interface ExtractedIntegration {
    id: string;
    name: string;
    version: string;
}
export type IntegrationListExtractor = () => Promise<ExtractedIntegration[]>;
export interface StreamsFieldsSearchParams {
    streamName: string;
}
export type ExtractedStreamFields = Record<string, FieldMetadataPlain>;
export type StreamsFieldsExtractor = (params: StreamsFieldsSearchParams & {
    esClient: ElasticsearchClient;
}) => Promise<ExtractedStreamFields>;
