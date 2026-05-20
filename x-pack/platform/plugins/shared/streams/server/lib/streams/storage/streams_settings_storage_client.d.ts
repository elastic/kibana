import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { type IStorageClient } from '@kbn/storage-adapter';
declare const streamsSettingsStorageSettings: {
    name: string;
    schema: {
        properties: {
            wired_streams_disabled_by_user: import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty>;
        };
    };
};
interface StreamsSettings {
    wired_streams_disabled_by_user: boolean;
}
type StreamsSettingsStorageSettings = typeof streamsSettingsStorageSettings;
export type StreamsSettingsStorageClient = IStorageClient<StreamsSettingsStorageSettings, StreamsSettings>;
export declare function createStreamsSettingsStorageClient(esClient: ElasticsearchClient, logger: Logger): StreamsSettingsStorageClient;
export {};
