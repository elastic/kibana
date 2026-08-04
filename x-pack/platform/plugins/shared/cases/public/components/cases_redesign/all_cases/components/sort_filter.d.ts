import React from 'react';
type SortOrder = 'asc' | 'desc';
interface SortFilterProps {
    sortOrder: SortOrder;
    onChange: (sortOrder: SortOrder) => void;
}
export declare const SortFilter: React.FC<SortFilterProps>;
export {};
