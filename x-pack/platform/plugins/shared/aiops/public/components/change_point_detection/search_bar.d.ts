import type { FC } from 'react';
import { type Filter, type Query } from '@kbn/es-query';
export interface SearchBarProps {
    query: Query;
    filters: Filter[];
    onQueryChange: (update: Query) => void;
    onFiltersChange: (update: Filter[]) => void;
}
/**
 * Reusable search bar component for the AIOps app.
 *
 * @param query
 * @param filters
 * @param onQueryChange
 * @param onFiltersChange
 * @constructor
 */
export declare const SearchBarWrapper: FC<SearchBarProps>;
