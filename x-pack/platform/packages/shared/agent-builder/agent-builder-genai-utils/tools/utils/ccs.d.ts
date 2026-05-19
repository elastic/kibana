import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { MappingField } from './mappings';
/**
 * Returns true if the resource name targets a remote cluster (contains ':'),
 * indicating a cross-cluster search (CCS) target.
 *
 * Examples:
 *  - 'remote_cluster:my-index' => true
 *  - 'my-local-index' => false
 *  - 'cluster_a:logs-*' => true
 */
export declare const isCcsTarget: (name: string) => boolean;
/**
 * Partition an array of named resources into local and CCS (remote) groups.
 * A resource is considered remote if its name contains ':'.
 */
export declare const partitionByCcs: <T extends {
    name: string;
}>(resources: T[]) => {
    local: T[];
    remote: T[];
};
/**
 * Retrieves the field list for a given resource using the _field_caps API,
 * which supports cross-cluster search (CCS) index patterns.
 *
 * This is used as a CCS-compatible fallback for the _mapping and
 * _data_stream/_mappings APIs, which do not support remote indices.
 */
export declare const getFieldsFromFieldCaps: ({ resource, esClient, }: {
    resource: string;
    esClient: ElasticsearchClient;
}) => Promise<MappingField[]>;
/**
 * Issues a single _field_caps request for all provided resource names and
 * splits the merged response back into per-resource field lists using the
 * per-capability `indices` property.
 */
export declare const getBatchedFieldsFromFieldCaps: ({ resources, esClient, }: {
    resources: string[];
    esClient: ElasticsearchClient;
}) => Promise<Record<string, MappingField[]>>;
export type IndexFieldType = 'index' | 'dataStream' | 'alias' | 'indexPattern';
export interface IndexFieldsResult {
    type: IndexFieldType;
    fields: MappingField[];
    rawMapping?: MappingTypeMapping;
}
/**
 * Resolves field information for a list of indices, transparently handling
 * the local-vs-CCS split. Local inputs are classified via `_resolve/index`
 * and routed to the appropriate mapping / field-caps fetcher; CCS inputs
 * go directly to the batched _field_caps API.
 */
export declare const getIndexFields: ({ indices, esClient, cleanup, }: {
    indices: string[];
    esClient: ElasticsearchClient;
    cleanup?: boolean;
}) => Promise<Record<string, IndexFieldsResult>>;
