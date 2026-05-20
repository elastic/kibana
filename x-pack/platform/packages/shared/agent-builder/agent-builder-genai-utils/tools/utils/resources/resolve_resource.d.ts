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
    /** whether the resource is a TSDB resource (any field has tsDimension or tsMetric) */
    isTsdb: boolean;
}
/**
 * Heuristic TSDB detection from field markers. Used as a fallback for resources where
 * we can't query an authoritative source per call: aliases, multi-target patterns, and
 * CCS / cross-project targets.
 */
export declare const deriveIsTsdb: (fields: MappingField[]) => boolean;
/**
 * Retrieve the field list and other relevant info from the given resource name (index, alias or datastream)
 * Note: this can target a single resource, the resource name must not be a pattern.
 */
export declare const resolveResource: ({ resourceName, esClient, }: {
    resourceName: string;
    esClient: ElasticsearchClient;
}) => Promise<ResolveResourceResponse>;
/**
 * Retrieve resource metadata for ES|QL generation.
 * Supports index patterns and comma-separated targets by using field_caps
 * when multiple resources are resolved. Multi-target results use {@link EsResourceType.indexPattern}.
 */
export declare const resolveResourceForEsql: ({ resourceName, esClient, }: {
    resourceName: string;
    esClient: ElasticsearchClient;
}) => Promise<ResolveResourceResponse>;
