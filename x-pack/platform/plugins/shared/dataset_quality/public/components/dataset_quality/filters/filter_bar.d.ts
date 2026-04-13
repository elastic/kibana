import React from 'react';
export interface FilterBarComponentProps {
    query?: string;
    onQueryChange: (query: string) => void;
}
export declare const FilterBar: ({ query, onQueryChange }: FilterBarComponentProps) => React.JSX.Element;
