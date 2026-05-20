import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
interface TemplateManagementOptions {
    esClient: ElasticsearchClient;
    template: IndicesPutIndexTemplateRequest;
    logger: Logger;
}
interface DeleteTemplateOptions {
    esClient: ElasticsearchClient;
    name: string;
    logger: Logger;
}
export declare function upsertTemplate({ esClient, template, logger }: TemplateManagementOptions): Promise<void>;
export declare function deleteTemplate({ esClient, name, logger }: DeleteTemplateOptions): Promise<void>;
export {};
