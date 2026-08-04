import type { ElasticsearchClient } from '@kbn/core/server';
export declare const ensureInferenceDeployed: ({ client, inferenceId, }: {
    client: ElasticsearchClient;
    inferenceId?: string;
}) => Promise<void>;
export declare const ensureDefaultElserDeployed: ({ client }: {
    client: ElasticsearchClient;
}) => Promise<void>;
