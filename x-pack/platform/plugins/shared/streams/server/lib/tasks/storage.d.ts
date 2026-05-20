import { type IStorageClient } from '@kbn/storage-adapter';
import type { PersistedTask } from './types';
export declare const taskStorageSettings: {
    name: string;
    schema: {
        properties: {
            id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            type: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            status: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            stream: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            space: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            created_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            last_completed_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            last_acknowledged_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            last_canceled_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            last_failed_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            task: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
        };
    };
};
export type TaskStorageSettings = typeof taskStorageSettings;
export type TaskStorageClient = IStorageClient<TaskStorageSettings, PersistedTask>;
