import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingFieldWithStats } from '../sampling';
import type { ResolveResourceResponse } from './resolve_resource';
export type ResolvedResourceWithSampling = Omit<ResolveResourceResponse, 'fields'> & {
    fields: MappingFieldWithStats[];
};
/**
 * Resolve an ES|QL target and generate field stats based on sampling.
 */
export declare const resolveResourceForEsqlWithSamplingStats: ({ resourceName, esClient, samplingSize, }: {
    resourceName: string;
    esClient: ElasticsearchClient;
    samplingSize?: number;
}) => Promise<{
    fields: MappingFieldWithStats[];
    name: string;
    type: import("@kbn/agent-builder-common").EsResourceType;
    description?: string;
    isTsdb: boolean;
}>;
