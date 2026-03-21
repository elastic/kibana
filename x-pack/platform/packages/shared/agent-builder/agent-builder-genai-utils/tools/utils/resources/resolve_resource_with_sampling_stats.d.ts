import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingFieldWithStats } from '../sampling';
import type { ResolveResourceResponse } from './resolve_resource';
export type ResolvedResourceWithSampling = Omit<ResolveResourceResponse, 'fields'> & {
    fields: MappingFieldWithStats[];
};
/**
 * Resolve a resource and generate field stats based on sampling
 */
export declare const resolveResourceWithSamplingStats: ({ resourceName, esClient, samplingSize, }: {
    resourceName: string;
    esClient: ElasticsearchClient;
    samplingSize?: number;
}) => Promise<{
    fields: MappingFieldWithStats[];
    name: string;
    type: import("@kbn/agent-builder-common").EsResourceType;
    description?: string;
}>;
