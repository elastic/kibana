import React from 'react';
import type { FilterOptions } from '../../containers/types';
interface TableSearchComponentProps {
    filterOptionsSearch: string;
    onFilterOptionsChange: (filterOptions: Partial<FilterOptions>) => void;
}
export declare const TableSearch: React.NamedExoticComponent<TableSearchComponentProps>;
export {};
