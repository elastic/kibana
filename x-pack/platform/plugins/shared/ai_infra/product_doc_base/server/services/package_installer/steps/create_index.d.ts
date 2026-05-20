import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
export declare const createIndex: ({ esClient, indexName, manifestVersion, mappings, log, }: {
    esClient: ElasticsearchClient;
    indexName: string;
    manifestVersion: string;
    mappings: MappingTypeMapping;
    log: Logger;
}) => Promise<void>;
export declare const overrideInferenceSettings: (mappings: MappingTypeMapping, inferenceId: string, modelSettingsToOverride?: object) => void;
