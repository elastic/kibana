import type { FC } from 'react';
import { type Query, type Filter } from '@kbn/es-query';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
interface Props {
    searchString: Query['query'];
    searchQuery: Query['query'];
    searchQueryLanguage: SearchQueryLanguage;
    setSearchParams({ searchQuery, searchString, queryLanguage, filters, }: {
        searchQuery: Query['query'];
        searchString: Query['query'];
        queryLanguage: SearchQueryLanguage;
        filters: Filter[];
    }): void;
    onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}
export declare const SearchPanel: FC<Props>;
export {};
