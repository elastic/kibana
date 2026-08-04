import type { DataViewField } from '@kbn/data-views-plugin/common';
/**
 * Temporarily add list of supported ES aggs until the PR below is merged
 * https://github.com/elastic/elasticsearch/pull/93884
 */
export declare const getSupportedAggs: (field: DataViewField) => Set<string>;
export declare const getESQLSupportedAggs: (field: {
    name: string;
    type: string;
}, aggregatable?: boolean) => Set<string>;
