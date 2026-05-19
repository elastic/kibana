import type { Query, Filter, DataViewBase, TimeRange, EsQueryConfig, AggregateQuery } from '@kbn/es-query';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { Capabilities } from '@kbn/core/public';
import type { TableInspectorAdapter, Datasource, IndexPatternMap } from '@kbn/lens-common';
import type { Visualization } from '..';
interface LayerMetaInfo {
    id: string;
    columns: string[];
    filters: Record<'enabled' | 'disabled', {
        kuery: Query[][] | undefined;
        lucene: Query[][] | undefined;
    }>;
}
/**
 * The config builder will create predictable ad hoc index pattern IDs that do not
 * necessarily match the data view IDs in the current Kibana instance.
 * This function tries to find a data view matching the given index pattern ID
 * either by ID or by title.
 */
export declare function findDataViewByIndexPatternId(indexPatternId: string, indexPatterns: IndexPatternMap): import("@kbn/lens-common").IndexPattern;
export declare function getLayerMetaInfo(currentDatasource: Datasource | undefined, datasourceState: unknown, activeVisualization: Visualization | undefined, visualizationState: unknown, activeData: TableInspectorAdapter | undefined, indexPatterns: IndexPatternMap, timeRange: TimeRange | undefined, capabilities: RecursiveReadonly<{
    navLinks: Capabilities['navLinks'];
    discover_v2?: Capabilities['discover_v2'];
}>): {
    meta: LayerMetaInfo | undefined;
    isVisible: boolean;
    error: string | undefined;
};
type QueryLanguage = 'lucene' | 'kuery';
/**
 * Translates an arbitrarily-large set of @type {Query}s (including those supplied in @type {LayerMetaInfo})
 * and existing Kibana @type {Filter}s into a single query and a new set of @type {Filter}s. This allows them to
 * function as an equivalent context in Discover.
 *
 * If some of the queries are in KQL and some in Lucene, all the queries in one language will be merged into
 * a large query to be shown in the query bar, while the queries in the other language will be encoded as an
 * extra filter pill.
 */
export declare function combineQueryAndFilters(query: Query | Query[] | AggregateQuery | undefined, filters: Filter[], meta: LayerMetaInfo, dataViews: DataViewBase[] | undefined, esQueryConfig: EsQueryConfig): {
    filters: Filter[];
    query: {
        language: QueryLanguage;
        query: string | {
            [key: string]: any;
        };
    };
};
export {};
