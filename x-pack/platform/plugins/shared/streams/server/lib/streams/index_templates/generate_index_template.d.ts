import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { type FormattedIngestSettings } from '../state_management/streams/helpers';
export declare const MAX_PRIORITY = 9223372036854775807n;
export declare function generateIndexTemplate(name: string, lifecycle?: IngestStreamLifecycle, failureStore?: FailureStore, isServerless?: boolean, 
/** When the backing data stream is deferred, ingest settings must live on the template. */
deferredFormattedIngestSettings?: FormattedIngestSettings): {
    name: string;
    index_patterns: string[];
    composed_of: string[];
    priority: number;
    version: number;
    _meta: {
        managed: boolean;
        description: string;
        managed_by: string;
    };
    data_stream: {
        hidden: boolean;
    };
    template: {
        data_stream_options?: import("@elastic/elasticsearch/lib/api/types").IndicesDataStreamOptionsTemplate | undefined;
        lifecycle?: {
            data_retention?: string | undefined;
        } | undefined;
        settings: {
            index: {
                number_of_replicas?: number;
                number_of_shards?: number;
                refresh_interval?: string | -1;
                default_pipeline: string;
            };
        };
        mappings: {
            properties: {
                'stream.name': {
                    type: "constant_keyword";
                    value: string;
                };
            };
        };
    };
    allow_auto_create: boolean;
    ignore_missing_component_templates: string[];
};
