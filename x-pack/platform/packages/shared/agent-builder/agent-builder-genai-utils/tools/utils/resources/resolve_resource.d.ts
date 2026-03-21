import type { ElasticsearchClient } from '@kbn/core/server';
import { EsResourceType } from '@kbn/agent-builder-common';
import type { MappingField } from '../mappings';
export interface ResolveResourceResponse {
    /** name of the resource */
    name: string;
    /** type of the resource*/
    type: EsResourceType;
    /** list of fields */
    fields: MappingField[];
    /** description from the meta, if available */
    description?: string;
}
/**
 * Retrieve the field list and other relevant info from the given resource name (index, alias or datastream)
 * Note: this can target a single resource, the resource name must not be a pattern.
 */
export declare const resolveResource: ({ resourceName, esClient, }: {
    resourceName: string;
    esClient: ElasticsearchClient;
}) => Promise<ResolveResourceResponse>;
