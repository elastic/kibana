import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IIndexPatternString } from '../resource_installer_utils';
import type { DataStreamAdapter } from './data_stream_adapter';
interface GetIndexTemplateOpts {
    componentTemplateRefs: string[];
    ilmPolicyName: string;
    indexPatterns: IIndexPatternString;
    kibanaVersion: string;
    namespace: string;
    totalFieldsLimit: number;
    dataStreamAdapter: DataStreamAdapter;
}
export declare const getIndexTemplate: ({ componentTemplateRefs, ilmPolicyName, indexPatterns, kibanaVersion, namespace, totalFieldsLimit, dataStreamAdapter, }: GetIndexTemplateOpts) => IndicesPutIndexTemplateRequest;
interface CreateOrUpdateIndexTemplateOpts {
    logger: Logger;
    esClient: ElasticsearchClient;
    template: IndicesPutIndexTemplateRequest;
}
export declare const createOrUpdateIndexTemplate: ({ logger, esClient, template, }: CreateOrUpdateIndexTemplateOpts) => Promise<void>;
export {};
