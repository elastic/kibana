import React from 'react';
import type { FiltersIndexPatternColumn, LensAggFilter as Filter, IndexPattern } from '@kbn/lens-common';
import type { OperationDefinition } from '..';
export declare const filtersDefaultLabel: string;
export declare const filtersOperation: OperationDefinition<FiltersIndexPatternColumn, 'none', FiltersIndexPatternColumn['params']>;
export declare const FilterList: ({ filters, setFilters, indexPattern, defaultQuery, }: {
    filters: Filter[];
    setFilters: Function;
    indexPattern: IndexPattern;
    defaultQuery: Filter;
}) => React.JSX.Element;
