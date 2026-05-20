import type { ContentPackSavedObjectLinks, SavedObjectLinkWithReferences } from '@kbn/content-packs-schema';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { CONTENT_NAME, STREAM_NAME } from './fields';
export declare const contentStorageSettings: {
    name: string;
    schema: {
        properties: {
            "stream.name": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "content.name": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            dashboards: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>>;
            'dashboards.source_id': import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            'dashboards.target_id': import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            'dashboards.references': import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>>;
            'dashboards.references.source_id': import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            'dashboards.references.target_id': import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
        };
    };
};
export type ContentStorageSettings = typeof contentStorageSettings;
export interface StoredContentPack {
    [STREAM_NAME]: string;
    [CONTENT_NAME]: string;
    dashboards: SavedObjectLinkWithReferences[];
}
export declare class ContentClient {
    private readonly clients;
    constructor(clients: {
        storageClient: IStorageClient<ContentStorageSettings, StoredContentPack>;
    });
    getStoredContentPacks(streamName: string): Promise<StoredContentPack[]>;
    getStoredContentPack(streamName: string, contentName: string): Promise<StoredContentPack>;
    upsertStoredContentPack(streamName: string, content: {
        name: string;
    } & ContentPackSavedObjectLinks): Promise<void>;
}
