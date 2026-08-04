import type { Filter, Query } from '@kbn/es-query';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
export declare const SearchPanelContent: ({ searchQuery, searchString, searchQueryLanguage, dataView, setSearchParams, onQueryChange, }: {
    dataView: DataView;
    searchQuery: Query["query"];
    searchString: Query["query"];
    searchQueryLanguage: SearchQueryLanguage;
    onQueryChange?: (query: Query["query"] | undefined) => void;
    setSearchParams({ searchQuery, searchString, queryLanguage, filters, }: {
        searchQuery: Query["query"];
        searchString: Query["query"];
        queryLanguage: SearchQueryLanguage;
        filters: Filter[];
    }): void;
}) => React.JSX.Element;
