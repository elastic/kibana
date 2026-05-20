import type { FC } from 'react';
import type { Query, Filter } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import type { OverallStats } from '../../types/overall_stats';
interface Props {
    dataView: DataView;
    searchString: Query['query'];
    searchQuery: Query['query'];
    searchQueryLanguage: SearchQueryLanguage;
    overallStats: OverallStats;
    indexedFieldTypes: string[];
    setVisibleFieldTypes(q: string[]): void;
    visibleFieldTypes: string[];
    setVisibleFieldNames(q: string[]): void;
    visibleFieldNames: string[];
    setSearchParams({ searchQuery, searchString, queryLanguage, filters, }: {
        searchQuery: Query['query'];
        searchString: Query['query'];
        queryLanguage: SearchQueryLanguage;
        filters: Filter[];
    }): void;
    showEmptyFields: boolean;
    onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
    onQueryChange?: (query: Query['query'] | undefined) => void;
}
export declare const SearchPanel: FC<Props>;
export {};
