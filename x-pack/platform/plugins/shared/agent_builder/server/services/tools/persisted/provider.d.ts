import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { WritableToolProvider, ToolProviderFn } from '../tool_provider';
import type { AnyToolTypeDefinition } from '../tool_types/definitions';
export declare const createPersistedProviderFn: (opts: {
    logger: Logger;
    esClient: ElasticsearchClient;
    toolTypes: AnyToolTypeDefinition[];
}) => ToolProviderFn<false>;
export declare const createPersistedToolClient: ({ request, toolTypes, logger, esClient, space, }: {
    toolTypes: AnyToolTypeDefinition[];
    logger: Logger;
    esClient: ElasticsearchClient;
    space: string;
    request: KibanaRequest;
}) => WritableToolProvider;
