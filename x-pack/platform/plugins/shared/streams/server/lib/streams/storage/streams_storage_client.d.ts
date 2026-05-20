import { type IStorageClient } from '@kbn/storage-adapter';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Streams } from '@kbn/streams-schema';
declare const streamsStorageSettings: {
    name: string;
    schema: {
        properties: {
            name: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            type: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            description: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            updated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            ingest: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
            query: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
            query_streams: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
            field_descriptions: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
        };
    };
};
type StreamsStorageSettings = typeof streamsStorageSettings;
export type StreamsStorageClient = IStorageClient<StreamsStorageSettings, Streams.all.Definition>;
/**
 * This ensures there's only one way to initialize a storage client for streams, with the proper
 * settings and migration on read.
 * @param esClient
 * @param logger
 */
export declare function createStreamsStorageClient(esClient: ElasticsearchClient, logger: Logger): StreamsStorageClient;
export {};
